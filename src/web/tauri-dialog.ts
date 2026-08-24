export async function confirm(message: string): Promise<boolean> {
  return window.confirm(message)
}

export async function open(): Promise<null> {
  return null
}

export async function save(): Promise<null> {
  return null
}
