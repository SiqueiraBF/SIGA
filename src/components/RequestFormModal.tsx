
import React from 'react';
import { useRequestForm } from './RequestForm/useRequestForm';
import { RequestHeader } from './RequestForm/RequestHeader';
import { RequestSidePanel } from './RequestForm/RequestSidePanel';
import { RequestFooter } from './RequestForm/RequestFooter';
import { RequestItemForm } from './RequestForm/RequestItemForm';
import { RequestAnalystForm } from './RequestForm/RequestAnalystForm';
import { RequestItemsList } from './RequestForm/RequestItemsList';
import { AuditLogModal } from './AuditLogModal';

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
    canEditContext, canEditItems, canDelete, canReopen, hasFullManagement,
    handleGlobalAction, handleNotifyWhatsapp, handleDeleteItem,
    saveItem, analyzeItem
  } = useRequestForm(props);

  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans">

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

            {/* Analyst Mode */}
            {isAnalystMode && (
              <RequestAnalystForm
                analystSelectedItem={analystSelectedItem}
                loading={loading}
                onAnalyze={analyzeItem}
                onCancel={() => setAnalystSelectedItem(null)}
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

      </div>

      {currentRequestId && (
        <AuditLogModal
          isOpen={isAuditOpen}
          onClose={() => setIsAuditOpen(false)}
          registroId={currentRequestId}
        />
      )}
    </div>
  );
};
