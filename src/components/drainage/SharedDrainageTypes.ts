export interface StationEntry {
    postoId: string;
    stationName: string;
    tankName?: string;
    tanqueIdentificador?: string;
    litros: string;
    aspecto: string;
    destino: string;
    observacoes: string;
    photos: File[];
    photoPreviews: string[];
}

export const ASPECT_OPTIONS = [
    { value: 'Límpido e Isento', label: 'Límpido e Isento (Transparente, sem partículas)' },
    { value: 'Turvo', label: 'Turvo (Perda de transparência, possível umidade)' },
    { value: 'Com Água Livre', label: 'Com Água Livre (Separação clara de água no fundo)' },
    { value: 'Com Borra', label: 'Com Borra (Resíduos pastosos ou biológicos)' },
    { value: 'Com Sedimentos', label: 'Com Sedimentos (Areia, ferrugem, sólidos)' },
    { value: 'Escurecido', label: 'Escurecido (Oxidação, velho)' },
];
