export const equipmentTasks = ['Ploughing', 'Harrowing', 'Ridging'] as const;
export type EquipmentStatus = 'open' | 'quoted' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export interface EquipmentMember {
  uid: string; name: string; phone: string; hectares: number; accepted: boolean; paid: boolean;
}
export interface EquipmentQuote {
  operator: string; phone: string; date: string; totalKobo: number; terms: string;
}
export interface EquipmentRequest {
  id: string; ownerUid: string; memberUids: string[]; community: string;
  task: typeof equipmentTasks[number]; startDate: string; endDate: string;
  status: EquipmentStatus; members: EquipmentMember[]; quote: EquipmentQuote | null;
  createdAt: string; updatedAt: string; version: number;
}
export interface EquipmentView {
  id: string; community: string; task: string; startDate: string; endDate: string;
  status: EquipmentStatus; hectares: number; memberCount: number; isOwner: boolean; isMember: boolean;
  version: number; quote: EquipmentQuote | null;
  members: Array<{ name: string; hectares: number; accepted: boolean; paid: boolean; isMe: boolean; shareKobo: number | null; phone?: string }>;
}
// Integer kobo allocation: distribute rounding remainder deterministically.
export function equipmentShares(members: Pick<EquipmentMember, 'hectares'>[], totalKobo: number): number[] {
  const units = members.map(m => Math.round(m.hectares * 100));
  const total = units.reduce((a,b)=>a+b,0);
  const shares = units.map(n=>Math.floor(totalKobo*n/total));
  let remainder = totalKobo-shares.reduce((a,b)=>a+b,0);
  for (let i=0; remainder>0; i++, remainder--) shares[i%shares.length]!++;
  return shares;
}
export function equipmentView(request: EquipmentRequest, uid: string): EquipmentView {
  const isMember=request.memberUids.includes(uid), isOwner=request.ownerUid===uid;
  const shares=request.quote ? equipmentShares(request.members,request.quote.totalKobo) : [];
  return { id:request.id, community:request.community, task:request.task, startDate:request.startDate,
    endDate:request.endDate, status:request.status, hectares:request.members.reduce((n,m)=>n+m.hectares,0),
    memberCount:request.members.length, isOwner, isMember, version:request.version,
    quote:isMember?request.quote:null,
    members:isMember?request.members.map((m,i)=>({ name:m.name, hectares:m.hectares, accepted:m.accepted,
      paid:m.paid, isMe:m.uid===uid, shareKobo:shares[i]??null, ...(isOwner||m.uid===uid||m.uid===request.ownerUid?{phone:m.phone}:{}) })):[] };
}
