import { ShieldX } from 'lucide-react';

interface AccessDeniedProps {
  title?: string;
  description?: string;
  className?: string;
}

export function AccessDenied({
  title = 'Acesso Negado',
  description = 'Você não tem permissão para acessar este recurso. Contate um administrador.',
  className = '',
}: AccessDeniedProps) {
  return (
    <div className={`p-8 text-center ${className}`}>
      <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-2xl p-8">
        <div className="p-4 bg-red-100 rounded-full w-fit mx-auto mb-4">
          <ShieldX className="w-12 h-12 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-red-800 mb-2">{title}</h2>
        <p className="text-red-600 text-sm">{description}</p>
      </div>
    </div>
  );
}
