-- Migration: Optimize performance of get_request_dashboard_stats
-- Description: The get_request_dashboard_stats RPC was failing with statement timeouts due to correlated subqueries doing N+1 lookups on the large audit_logs table. This migration refactors the function to use CTEs to group the audit logs once, massively improving performance.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_request_dashboard_stats(start_date text, end_date text, filter_fazenda_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO public
AS $function$
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
            WITH first_status_dates AS (
                SELECT 
                    registro_id,
                    MIN(data_hora) FILTER (WHERE dados_novos->>'status' = 'Aguardando') as first_aguardando,
                    MIN(data_hora) FILTER (WHERE dados_novos->>'status' = 'Finalizado') as first_finalizado
                FROM audit_logs
                WHERE tabela IN ('Solicitacao', 'solicitacoes')
                AND dados_novos->>'status' IN ('Aguardando', 'Finalizado')
                GROUP BY registro_id
            ),
            reqs AS (
                SELECT 
                    s.id, 
                    s.status,
                    s.created_at,
                    s.updated_at,
                    (SELECT COUNT(*) FROM itens_solicitacao i WHERE i.solicitacao_id = s.id) as item_count,
                    fsd.first_finalizado as finalizado_time,
                    fsd.first_aguardando as aguardando_time
                FROM solicitacoes s
                LEFT JOIN first_status_dates fsd ON fsd.registro_id = s.id
                WHERE s.data_abertura::DATE BETWEEN v_start_date AND v_end_date
                AND (filter_fazenda_id IS NULL OR s.fazenda_id = filter_fazenda_id)
            )
            SELECT json_build_object(
                'total_requests', COUNT(*),
                'total_items', COALESCE(SUM(item_count), 0),
                'pending_count', COUNT(*) FILTER (WHERE status != 'Finalizado' AND status != 'Devolvido'),
                'finished_count', COUNT(*) FILTER (WHERE status = 'Finalizado'),
                'avg_sla_hours', ROUND(COALESCE(
                    AVG(
                        EXTRACT(EPOCH FROM (
                            COALESCE(finalizado_time, updated_at) - COALESCE(aguardando_time, created_at)
                        )) / 3600
                    ) FILTER (WHERE status = 'Finalizado'),
                    0
                )::numeric, 1),
                'avg_items_per_request', CASE WHEN COUNT(*) > 0 THEN ROUND((COALESCE(SUM(item_count), 0)::NUMERIC / COUNT(*)), 1) ELSE 0 END
            )
            FROM reqs
        ),
        'charts', json_build_object(
            'by_classification', (
                SELECT COALESCE(json_agg(item), '[]'::json)
                FROM (
                    WITH finalized_dates AS (
                        SELECT registro_id, MIN(data_hora)::DATE as min_date
                        FROM audit_logs
                        WHERE tabela IN ('Solicitacao', 'solicitacoes')
                        AND dados_novos->>'status' = 'Finalizado'
                        GROUP BY registro_id
                    ),
                    reqs AS (
                        SELECT 
                            s.id, 
                            COALESCE(fd.min_date, s.updated_at::DATE) as finalization_date
                        FROM solicitacoes s
                        LEFT JOIN finalized_dates fd ON fd.registro_id = s.id
                        WHERE (filter_fazenda_id IS NULL OR s.fazenda_id = filter_fazenda_id)
                    )
                    SELECT 
                        COALESCE(i.tipo_tratativa, 'Sem Classificação') as name, 
                        COUNT(*) as value
                    FROM itens_solicitacao i
                    JOIN reqs r ON i.solicitacao_id = r.id
                    WHERE r.finalization_date BETWEEN v_start_date AND v_end_date
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
                    WITH days AS (
                        SELECT d::DATE as date
                        FROM generate_series(v_start_date, v_end_date, '1 day'::interval) as ds(d)
                    ),
                    created_stats AS (
                        SELECT s.data_abertura::DATE as date, COUNT(*) as total
                        FROM solicitacoes s
                        WHERE s.data_abertura::DATE BETWEEN v_start_date AND v_end_date
                        AND (filter_fazenda_id IS NULL OR s.fazenda_id = filter_fazenda_id)
                        GROUP BY 1
                    ),
                    finalized_dates AS (
                        SELECT registro_id, MIN(data_hora)::DATE as min_date
                        FROM audit_logs
                        WHERE tabela IN ('Solicitacao', 'solicitacoes')
                        AND dados_novos->>'status' = 'Finalizado'
                        GROUP BY registro_id
                    ),
                    finished_stats AS (
                        SELECT 
                            finish_date,
                            COUNT(*) as finished
                        FROM (
                            SELECT 
                                COALESCE(fd.min_date, s.updated_at::DATE) as finish_date
                            FROM solicitacoes s
                            LEFT JOIN finalized_dates fd ON fd.registro_id = s.id
                            WHERE s.status = 'Finalizado'
                            AND (filter_fazenda_id IS NULL OR s.fazenda_id = filter_fazenda_id)
                        ) t
                        WHERE finish_date BETWEEN v_start_date AND v_end_date
                        GROUP BY 1
                    ),
                    returned_stats AS (
                        SELECT al.data_hora::DATE as date, COUNT(DISTINCT al.registro_id) as returned
                        FROM audit_logs al
                        JOIN solicitacoes s ON al.registro_id = s.id
                        WHERE al.tabela IN ('Solicitacao', 'solicitacoes')
                        AND al.dados_novos->>'status' = 'Devolvido'
                        AND al.data_hora::DATE BETWEEN v_start_date AND v_end_date
                        AND (filter_fazenda_id IS NULL OR s.fazenda_id = filter_fazenda_id)
                        GROUP BY 1
                    )
                    SELECT 
                        d.date,
                        COALESCE(c.total, 0) as total,
                        COALESCE(f.finished, 0) as finished,
                        COALESCE(r.returned, 0) as returned
                    FROM days d
                    LEFT JOIN created_stats c ON d.date = c.date
                    LEFT JOIN finished_stats f ON d.date = f.finish_date
                    LEFT JOIN returned_stats r ON d.date = r.date
                    ORDER BY d.date
                ) item
            )
        )
    ) INTO result;

    RETURN result;
END;
$function$;

COMMIT;
