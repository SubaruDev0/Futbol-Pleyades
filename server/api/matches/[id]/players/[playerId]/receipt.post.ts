// Un jugador (o quien trajo al invitado) envía la captura de la transferencia a revisión.
export default defineEventHandler(async (event) => {
  const { db, user, player } = await requirePayableRow(event)

  const file = await readReceiptUpload(event)
  const key = receiptStore.newKey(file.type)
  await receiptStore.put(key, file.bytes)

  return replacePendingReceipt(db, player.id, { uploadedBy: user.id, fileKey: key, contentType: file.type })
})
