// Avisa que el comprobante se mandó por otro medio (WhatsApp, en persona…): no hay imagen, quien cobra confirma.
export default defineEventHandler(async (event) => {
  const { db, user, player } = await requirePayableRow(event)
  return replacePendingReceipt(db, player.id, { uploadedBy: user.id, fileKey: null, contentType: null })
})
