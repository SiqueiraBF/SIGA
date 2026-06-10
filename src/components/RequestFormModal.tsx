
import React from 'react';
import { Modal } from './ui/Modal';
import { useRequestForm } from './RequestForm/useRequestForm';
import { RequestHeader } from './RequestForm/RequestHeader';
import { RequestSidePanel } from './RequestForm/RequestSidePanel';
import { RequestFooter } from './RequestForm/RequestFooter';
import { RequestItemForm } from './RequestForm/RequestItemForm';
import { RequestAnalystForm } from './RequestForm/RequestAnalystForm';
import { RequestItemsList } from './RequestForm/RequestItemsList';
import { AuditLogModal } from './AuditLogModal';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface RequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  requestId: string | null;
  initialData?: any;
}

export const RequestFormModal: React.FC<RequestFormModalProps> = (props) => {
  const {
    contextData, setContextData,
    items, loading, fazendas,
    isAuditOpen, setIsAuditOpen,
    editingItem, setEditingItem,
    analystSelectedItem, setAnalystSelectedItem,
    currentRequestId,
    isNew, isOwner, isAnalystMode, isRegistrar,
    canEditContext, canEditItems, canEditAttachments, canDelete, canReopen, hasFullManagement,
    handleGlobalAction, handleNotifyWhatsapp, handleDeleteItem,
    saveItem, analyzeItem, handleReprocessAI,
    attachments, handleUploadAttachment, handleDeleteAttachment,
    confirmDialog, setConfirmDialog
  } = useRequestForm(props);

  return (
    <>
      <Modal 
        isOpen={props.isOpen} 
        onClose={props.onClose} 
        size="xl" 
        className="max-w-6xl h-[85vh] !rounded-2xl"
        closeOnOverlayClick={false}
      >
        <RequestHeader
          isNew={isNew}
          contextData={contextData}
          requestId={props.requestId}
          onClose={props.onClose}
          onOpenAudit={() => setIsAuditOpen(true)}
        />

        <div className="flex-1 flex overflow-hidden">
          <RequestSidePanel
            contextData={contextData}
            setContextData={setContextData}
            fazendas={fazendas}
            canEditContext={canEditContext}
            attachments={attachments}
            onUploadAttachment={handleUploadAttachment}
            onDeleteAttachment={handleDeleteAttachment}
            loading={loading}
            canEditAttachments={canEditAttachments}
          />

          <div className="flex-1 flex flex-col bg-slate-50/50 relative">

            {/* Creator Mode */}
            {!isAnalystMode && canEditItems && (contextData.status !== 'Devolvido' || editingItem) && (
              <RequestItemForm
                editingItem={editingItem}
                loading={loading}
                onSave={saveItem}
                onCancel={() => setEditingItem(null)}
              />
            )}

            <RequestItemsList
              items={items}
              contextData={contextData}
              isAnalystMode={isAnalystMode}
              canEditItems={canEditItems}
              analystSelectedItem={analystSelectedItem}
              setAnalystSelectedItem={setAnalystSelectedItem}
              handleEditItem={setEditingItem}
              handleDeleteItem={handleDeleteItem}
              onAnalyzeItem={analyzeItem}
              onReprocessAI={handleReprocessAI}
              loading={loading}
            />
          </div>
        </div>

        <RequestFooter
          loading={loading}
          onClose={props.onClose}
          canDelete={canDelete}
          handleDelete={() => handleGlobalAction('DELETE')}
          handleAction={handleGlobalAction}
          contextData={contextData}
          items={items}
          isNew={isNew}
          isOwner={isOwner}
          hasFullManagement={hasFullManagement}
          isRegistrar={isRegistrar}
          handleNotify={handleNotifyWhatsapp}
          canReopen={canReopen}
        />
      </Modal>

      {currentRequestId && (
        <AuditLogModal
          isOpen={isAuditOpen}
          onClose={() => setIsAuditOpen(false)}
          registroId={currentRequestId}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
      />
    </>
  );
};
