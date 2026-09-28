/** "+56954971044" → "+56 9 5497 1044"; cualquier otro formato se muestra tal cual. */
export function formatPhone(phone: string): string {
  const m = phone.match(/^\+56(9)(\d{4})(\d{4})$/)
  return m ? `+56 ${m[1]} ${m[2]} ${m[3]}` : phone
}
