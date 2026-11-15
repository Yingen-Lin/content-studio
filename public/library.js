export function normalizeTags(tags) {
  const result=[];
  for(const tag of tags.map(t=>t.trim()).filter(Boolean))if(!result.some(t=>t.toLowerCase()===tag.toLowerCase()))result.push(tag);
  return result;
}
export function mergePhotos(existing,incoming) {
  const map=new Map(existing.map(p=>[p.id,p]));
  for(const p of incoming)map.set(p.id,{...p,tags:map.get(p.id)?.tags||[]});
  return [...map.values()];
}
