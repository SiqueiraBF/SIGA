-- Function: get_request_dashboard_stats
-- Description: Calculates dashboard statistics including SLA based on audit logs.

-- 1. CLEANUP: Drop all possible variants to avoid "ambiguous function" errors
DROP FUNCTION IF EXISTS get_request_dashboard_stats(date, date, uuid);
DROP FUNCTION IF EXISTS get_request_dashboard_stats(text, text, uuid);

-- 2. CREATE NEW FUNCTION (Using TEXT for dates to avoid type ambiguity from client)
CREATE OR REPLACE FUNCTION get_request_dashboard_stats(
    start_date TEXT,
    end_date TEXT,
    filter_fazenda_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- Cast input parameters
    v_start_date := start_date::DATE;
    v_end_date := end_date::DATE;

    SELECT json_build_object(
        'overview', (
            SELECT json_build_object(
                'total_requests', COUNT(*),
                'total_items', COALESCE(SUM(item_count), 0),
                'pending_count', COUNT(*) FILTER (WHERE status != 'Finalizado' AND status != 'Devolvido'),
                'finished_count', COUNT(*) FILTER (WHERE status = 'Finalizado'),
                'avg_sla_hours', ROUND(COALESCE(
                    AVG(
                        EXTRACT(EPOCH FROM (
                            -- End Time: First time it became Finalizado
                            COALESCE(
                                (
                                    SELECT MIN(al_end.data_hora) 
                                    FROM audit_logs al_end 
                                    WHERE al_end.registro_id = s.id 
                                    -- Check for both table name variants
                                    AND al_end.tabela IN ('Solicitacao', 'solicitacoes') 
                                    -- Check for status change to Finalizado
                                    AND (al_end.dados_novos->>'status' = 'Finalizado')
                                ),
                                s.updated_at -- Fallback
                            )
                            -
                            -- Start Time: First time it became Aguardando
                            COALESCE(
                                (
                                    SELECT MIN(al_start.data_hora) 
                                    FROM audit_logs al_start 
                                    WHERE al_start.registro_id = s.id 
                                    -- Check for both table name variants
                                    AND al_start.tabela IN ('Solicitacao', 'solicitacoes')
                                    -- Check for status change to Aguardando
                                    AND (al_start.dados_novos->>'status' = 'Aguardando')
                                ),
                                s.created_at -- Fallback
                            )
                        )) / 3600
                    ) FILTER (WHERE status = 'Finalizado'),
                    0
                )::numeric, 1), -- Round to 1 decimal place
                'avg_items_per_request', CASE WHEN COUNT(*) > 0 THEN ROUND((COALESCE(SUM(item_count), 0)::NUMERIC / COUNT(*)), 1) ELSE 0 END
            )
            FROM (
                SELECT s.*, (SELECT COUNT(*) FROM itens_solicitacao i WHERE i.solicitacao_id = s.id) as item_count
                FROM solicitacoes s
                WHERE s.data_abertura::DATE BETWEEN v_start_date AND v_end_date
                AND (filter_fazenda_id IS NULL OR s.fazenda_id = filter_fazenda_id)
            ) s
        ),
        'charts', json_build_object(
            'by_classification', (
                SELECT COALESCE(json_agg(item), '[]'::json)
                FROM (
                    SELECT 
                        COALESCE(tipo_tratativa, 'Sem Classificação') as name, 
                        COUNT(*) as value
                    FROM itens_solicitacao i
                    JOIN solicitacoes s ON i.solicitacao_id = s.id
                    LEFT JOIN audit_logs al ON al.registro_id = s.id AND al.tabela IN ('Solicitacao', 'solicitacoes') AND al.dados_novos->>'status' = 'Finalizado'
                    WHERE 
                        -- Use Finalization Date (Activity View) to align with Daily Volume chart
                        COALESCE(al.data_hora, s.updated_at)::DATE BETWEEN v_start_date AND v_end_date
                    AND (filter_fazenda_id IS NULL OR s.fazenda_id = filter_fazenda_id)
                    GROUP BY 1
                ) item
            ),
            'by_priority', (
                SELECT COALESCE(json_agg(item), '[]'::json)
                FROM (
                    SELECT prioridade as name, COUNT(i.id) as value
                    FROM solicitacoes s
                    JOIN itens_solicitacao i ON s.id = i.solicitacao_id
                    WHERE s.data_abertura::DATE BETWEEN v_start_date AND v_end_date
                    AND (filter_fazenda_id IS NULL OR s.fazenda_id = filter_fazenda_id)
                    GROUP BY prioridade
                ) item
            ),
            'by_user', (
                SELECT COALESCE(json_agg(item), '[]'::json)
                FROM (
                    SELECT u.nome as name, COUNT(DISTINCT s.id) as requests, COUNT(i.id) as items
                    FROM solicitacoes s
                    JOIN usuarios u ON s.usuario_id = u.id
                    LEFT JOIN itens_solicitacao i ON s.id = i.solicitacao_id
                    WHERE s.data_abertura::DATE BETWEEN v_start_date AND v_end_date
                    AND (filter_fazenda_id IS NULL OR s.fazenda_id = filter_fazenda_id)
                    GROUP BY u.nome
                    ORDER BY requests DESC
                    LIMIT 10
                ) item
            ),
            'by_farm', (
                SELECT COALESCE(json_agg(item), '[]'::json)
                FROM (
                    SELECT f.id, f.nome as name, COUNT(i.id) as value
                    FROM solicitacoes s
                    JOIN fazendas f ON s.fazenda_id = f.id
                    JOIN itens_solicitacao i ON s.id = i.solicitacao_id
                    WHERE s.data_abertura::DATE BETWEEN v_start_date AND v_end_date
                    AND (filter_fazenda_id IS NULL OR s.fazenda_id = filter_fazenda_id)
                    GROUP BY f.id, f.nome
                    ORDER BY value DESC
                ) item
            ),
            'daily_volume', (
                SELECT COALESCE(json_agg(item), '[]'::json)
                FROM (
                    WITH finalized_dates AS (
                        SELECT 
                            s.id,
                            s.fazenda_id,
                            COALESCE(
                                (
                                    SELECT MIN(al.data_hora)::DATE
                                    FROM audit_logs al
                                    WHERE al.registro_id = s.id
                                    AND al.tabela IN ('Solicitacao', 'solicitacoes')
                                    AND al.dados_novos->>'status' = 'Finalizado'
                                ),
                                s.updated_at::DATE
                            ) as finish_date
                        FROM solicitacoes s
                        WHERE s.status = 'Finalizado'
                    )
                    SELECT
                        TO_CHAR(ds.d, 'DD/MM') as date,
                        -- Total Created (Activity: Created on this day)
                        (
                            SELECT COUNT(*)
                            FROM solicitacoes s
                            WHERE s.data_abertura::DATE = ds.d
                            AND (filter_fazenda_id IS NULL OR s.fazenda_id = filter_fazenda_id)
                        ) as total,
                        -- Finished (Activity: Finalized on this day)
                        (
                            SELECT COUNT(*)
                            FROM finalized_dates fd
                            WHERE fd.finish_date = ds.d
                            AND (filter_fazenda_id IS NULL OR fd.fazenda_id = filter_fazenda_id)
                        ) as finished,
                        -- Returned (Activity: Returned on this day)
                        (
                            SELECT COUNT(DISTINCT al.registro_id)
                            FROM audit_logs al
                            JOIN solicitacoes s ON al.registro_id = s.id
                            WHERE al.tabela IN ('Solicitacao', 'solicitacoes')
                            AND al.dados_novos->>'status' = 'Devolvido'
                            AND al.data_hora::DATE = ds.d
                            AND (filter_fazenda_id IS NULL OR s.fazenda_id = filter_fazenda_id)
                        ) as returned
                    FROM generate_series(v_start_date, v_end_date, '1 day'::interval) as ds(d)
                ) item
            )
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;
