import { z } from 'zod';

export const drainagePayloadSchema = z.object({
    posto_id: z.string().min(1, "Posto é obrigatório"),
    fazenda_id: z.string().min(1, "Fazenda é obrigatória"),
    usuario_id: z.string().min(1, "Usuário é obrigatório"),
    data_drenagem: z.string().datetime({ message: "Data de drenagem inválida" }),
    litros_drenados: z.number().positive("Volume drenado deve ser maior que zero"),
    aspecto_residuo: z.string().min(1, "Aspecto do resíduo é obrigatório"),
    destino_residuo: z.string().min(1, "Destino do resíduo é obrigatório"),
    observacoes: z.string().optional(),
    tanque_identificador: z.string().nullable().optional()
});

export const drainageSubmitSchema = z.object({
    id: z.string().optional(),
    drainage: drainagePayloadSchema,
    photos: z.array(z.any()).refine(files => {
        // Se for update e tiver existingPhotos, files não precisa ser > 0, mas para criação precisa
        // Como o React Hook recebe instâncias literais de File (Browser), usaremos 'any' com refine.
        return files.every(f => typeof f === 'object' && f.name && f.size > 0);
    }, { message: "Arquivo de foto inválido" }),
    existingPhotos: z.array(z.string()).optional()
}).refine(data => {
    // If it's a creation (no id) OR it's an update where you removed all existing photos,
    // you MUST provide at least one new photo.
    const hasNewPhotos = data.photos.length > 0;
    const hasExistingPhotos = data.existingPhotos && data.existingPhotos.length > 0;

    if (!data.id && !hasNewPhotos) return false;
    if (data.id && !hasExistingPhotos && !hasNewPhotos) return false;

    return true;
}, {
    message: "É obrigatório anexar pelo menos uma evidência (foto)",
    path: ["photos"]
});

export const drainageBatchEntrySchema = z.object({
    drainage: drainagePayloadSchema,
    photos: z.array(z.any()).min(1, "Pelo menos uma foto deve ser anexada"),
    fazendaNome: z.string().optional(),
    stationName: z.string().optional(),
    usuarioEmail: z.string().optional(),
    usuarioNome: z.string().optional(),
    sendEmail: z.boolean().optional()
});

export const drainageBatchSubmitSchema = z.array(drainageBatchEntrySchema).min(1, "O lote não pode estar vazio");
