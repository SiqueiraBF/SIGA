import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { PcmRequest } from '../../services/pcmService';
import { Modal } from '../ui/Modal';
import { ModalHeader } from '../ui/ModalHeader';
import { ModalFooter } from '../ui/ModalFooter';
import { FormField } from '../ui/FormField';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';

interface PcmCancelModalProps {
  isOpen: boolean;
  onClose: (success?: boolean) => void;
  onConfirm: (motivo: string, request: PcmRequest) => Promise<void>;
  request: PcmRequest | null;
}

export function PcmCancelModal({ isOpen, onClose, onConfirm, request }: PcmCancelModalProps) {
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirm(motivo, request);
      setMotivo('');
      onClose(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" className="!rounded-2xl">
      <ModalHeader 
        title="Cancelar Solicitação"
        icon={AlertTriangle}
        onClose={() => onClose(false)}
        iconClassName="text-red-600 bg-red-50 border-red-100"
      />
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="p-6 flex-1">
          <p className="text-sm text-slate-600 mb-6">
            Você está prestes a cancelar a requisição <strong className="text-slate-800">#{request.num_requisicao}</strong>. 
            Esta ação não pode ser desfeita e um e-mail será enviado ao almoxarifado informando o cancelamento.
          </p>

          <div className="space-y-2 mt-4">
            <FormField label="Motivo do Cancelamento" required>
              <Textarea
                required
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Descreva detalhadamente o motivo do cancelamento..."
                autoFocus
                className="h-32"
              />
            </FormField>
          </div>
        </div>

        <ModalFooter className="justify-between">
          <Button
            variant="secondary"
            onClick={() => onClose(false)}
            disabled={isSubmitting}
          >
            Voltar
          </Button>
          <Button
            variant="danger"
            type="submit"
            isLoading={isSubmitting}
            disabled={!motivo.trim() || isSubmitting}
          >
            Confirmar Cancelamento
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
