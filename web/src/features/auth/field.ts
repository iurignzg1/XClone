// Lê um campo de texto de um <form> enviado.
export const field = (form: FormData, name: string) => String(form.get(name) ?? '');
