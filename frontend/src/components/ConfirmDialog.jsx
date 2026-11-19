import Button from "./Button.jsx";
import Modal from "./Modal.jsx";

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  onConfirm,
  onCancel,
  loading = false,
  danger = false,
}) {
  return (
    <Modal
      closeOnBackdrop={!loading}
      isOpen={isOpen}
      onClose={() => {
        if (!loading) onCancel?.();
      }}
      size="sm"
      title={title}
    >
      <p className="text-sm leading-6 text-app-muted">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button disabled={loading} onClick={onCancel} variant="secondary">
          Cancel
        </Button>
        <Button loading={loading} onClick={onConfirm} variant={danger ? "danger" : "primary"}>
          {loading ? "Please wait..." : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
