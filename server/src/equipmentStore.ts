import type { Firestore } from 'firebase-admin/firestore';
import { EquipmentError, type EquipmentStore } from './equipment.js';
import type { EquipmentRequest } from '../../shared/equipment.js';
export function firestoreEquipmentStore(db:Firestore):EquipmentStore {
  // Server-only collection: existing Firestore rules deny all direct client access.
  const requests=db.collection('equipmentRequestsEket');
  return {
    async list(uid,mine){
      const snapshot=await (mine?requests.where('memberUids','array-contains',uid).limit(100):requests.orderBy('createdAt','desc').limit(100)).get();
      return snapshot.docs.map(d=>d.data() as EquipmentRequest).filter(r=>mine||r.status==='open');
    },
    async create(r){return db.runTransaction(async tx=>{
      const ref=requests.doc(r.id),snapshot=await tx.get(ref);
      if(snapshot.exists){
        const old=snapshot.data() as EquipmentRequest;
        if(old.ownerUid!==r.ownerUid)throw new EquipmentError(409,'Request ID already in use.');
        return old;
      }
      tx.create(ref,r);return r;
    });},
    async update(id,change){return db.runTransaction(async tx=>{
      const ref=requests.doc(id),snapshot=await tx.get(ref);
      if(!snapshot.exists)throw new EquipmentError(404,'This request no longer exists.');
      const result=change(snapshot.data() as EquipmentRequest);tx.set(ref,result);return result;
    });},
  };
}
