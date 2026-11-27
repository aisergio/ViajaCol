/** Perfil que el sitio guarda de cada usuario (data-model: Perfil). */
export interface Profile {
  sub: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

/** Puerto de persistencia del perfil. El adaptador de producción es DynamoDB. */
export interface UsersRepository {
  get(sub: string): Promise<Profile | null>;
  /** Crea el perfil si no existe y devuelve el que quedó guardado (nunca pisa uno existente). */
  createIfMissing(profile: Profile): Promise<Profile>;
  /** Cambia el nombre de un perfil existente; `null` si no existe. */
  updateDisplayName(sub: string, displayName: string, updatedAt: string): Promise<Profile | null>;
  delete(sub: string): Promise<void>;
}

/** Puerto de administración del proveedor de identidad. El adaptador de producción es Cognito. */
export interface IdentityAdmin {
  /** Borra al usuario; si ya no existe, no falla. */
  deleteUser(sub: string): Promise<void>;
}
