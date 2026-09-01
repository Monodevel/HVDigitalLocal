import { apiFetch, apiJson, obtenerSesionWeb } from '../web/api'

export interface DatabaseStatus { name:string;path:string;exists:boolean;sizeBytes:number;modifiedUnix:number|null }
export interface BackupResult { path:string;createdUnix:number;databases:string[];sizeBytes:number }
export interface RestoreResult { sourcePath:string;safetyBackupPath:string;restoredDatabases:string[];restoredUnix:number }

function esAdmin():boolean{return obtenerSesionWeb()?.rol==='ADMIN'}
function exigirAdmin():void{if(!esAdmin())throw new Error('Esta operación está reservada al administrador de HVDigital.')}
function elegirArchivo():Promise<File|null>{return new Promise(resolve=>{const input=document.createElement('input');input.type='file';input.accept='.sql,application/sql,text/plain,application/octet-stream';input.style.display='none';input.addEventListener('change',()=>{resolve(input.files?.[0]??null);input.remove()},{once:true});document.body.appendChild(input);input.click()})}

export async function obtenerEstadoBasesDatos():Promise<DatabaseStatus[]>{
 if(!esAdmin())return[
  {name:'hvdigital.db',path:'HVDigital Server · datos privados de la cuenta',exists:true,sizeBytes:0,modifiedUnix:null},
  {name:'catalog.db',path:'HVDigital Server · catálogos institucionales compartidos',exists:true,sizeBytes:0,modifiedUnix:null},
 ]
 const bases=await apiJson<DatabaseStatus[]>('/backup/status');const maria=bases[0];if(!maria)return[];return[{...maria,name:'hvdigital.db',path:`${maria.path} · datos operacionales`},{...maria,name:'catalog.db',path:`${maria.path} · catálogos institucionales`}]
}
export async function seleccionarYCrearRespaldo():Promise<BackupResult|null>{exigirAdmin();const response=await apiFetch('/backup/download');if(!response.ok)throw new Error(await response.text());const blob=await response.blob();const disposition=response.headers.get('content-disposition')||'';const match=disposition.match(/filename="?([^";]+)"?/i);const filename=match?.[1]||`HVDigital_MariaDB_${Date.now()}.sql`;const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);return{path:filename,createdUnix:Math.floor(Date.now()/1000),databases:['MariaDB · datos operacionales y catálogos'],sizeBytes:blob.size}}
export async function seleccionarYRestaurarRespaldo():Promise<RestoreResult|null>{exigirAdmin();const file=await elegirArchivo();if(!file)return null;const accepted=window.confirm('La restauración reemplazará la base MariaDB central actual. Realice o descargue un respaldo antes de continuar. ¿Desea restaurar el archivo seleccionado?');if(!accepted)return null;const form=new FormData();form.append('file',file,file.name);return apiJson<RestoreResult>('/backup/restore',{method:'POST',body:form})}
export function formatearBytes(bytes:number):string{if(!Number.isFinite(bytes)||bytes<=0)return'0 B';const units=['B','KB','MB','GB'];const index=Math.min(Math.floor(Math.log(bytes)/Math.log(1024)),units.length-1);const value=bytes/(1024**index);return`${value.toFixed(index===0?0:1)} ${units[index]}`}
export function formatearFechaUnix(value:number|null|undefined):string{if(!value)return'Administrado por HVDigital Server';return new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value*1000))}
