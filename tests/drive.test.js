import test from 'node:test';
import assert from 'node:assert/strict';
import {fileId,parentQuery,indexFolder,FOLDER_MIME} from '../src/drive.js';
import {mergePhotos,normalizeTags} from '../public/library.js';
const root='root_folder_123';
test('accepts folder links and IDs; rejects other hosts and query injection',()=>{
 assert.equal(fileId(`https://drive.google.com/drive/folders/${root}?usp=sharing`),root);
 assert.equal(fileId(root),root);
 assert.throws(()=>fileId(`https://evil.example/drive/folders/${root}`));
 assert.throws(()=>parentQuery("x' or trashed = true"));
 assert.throws(()=>fileId('https://drive.google.com/file/d/test/view'));
});
test('folder indexing paginates, recurses, skips videos, and deduplicates files',async()=>{
 const calls=[];
 const get=async(path,params)=>{calls.push({path,params});if(path.startsWith('files/'))return{id:root,name:'Root',mimeType:FOLDER_MIME};
 if(params.q.includes(root)&&!params.pageToken)return{files:[{id:'photo1',name:'one.jpg',mimeType:'image/jpeg'},{id:'subfolder_123',name:'Photographer',mimeType:FOLDER_MIME},{id:'video1',mimeType:'video/mp4'}],nextPageToken:'second'};
 if(params.pageToken)return{files:[{id:'photo2',mimeType:'image/png'}]};
 return{files:[{id:'photo1',mimeType:'image/jpeg'},{id:'photo3',mimeType:'image/jpeg'}]}};
 const result=await indexFolder({rootId:root,recursive:true,get});
 assert.deepEqual(result.files.map(f=>f.id),['photo1','photo2','photo3']);
 assert.equal(calls.length,4);assert.equal(result.files[2].sourcePath,'Root / Photographer');
});
test('nonrecursive indexing never traverses child folders',async()=>{
 let calls=0;const get=async(path)=>{calls++;return path.startsWith('files/')?{id:root,mimeType:FOLDER_MIME}:{files:[{id:'subfolder_123',mimeType:FOLDER_MIME}]}};
 assert.equal((await indexFolder({rootId:root,recursive:false,get})).files.length,0);assert.equal(calls,2);
});
test('failed or incomplete indexing does not return a partial library',async()=>{
 const get=async(path)=>path.startsWith('files/')?{id:root,mimeType:FOLDER_MIME}:{incompleteSearch:true,files:[{id:'photo1',mimeType:'image/jpeg'}]};
 await assert.rejects(indexFolder({rootId:root,recursive:true,get}),/incomplete search/);
});
test('safety limits stop oversized imports instead of silently truncating',async()=>{
 const get=async(path)=>path.startsWith('files/')?{id:root,mimeType:FOLDER_MIME}:{files:[{id:'p1',mimeType:'image/jpeg'},{id:'p2',mimeType:'image/jpeg'}]};
 await assert.rejects(indexFolder({rootId:root,recursive:false,get,maxFiles:1}),/exceeds/);
});
test('refresh and overlapping sources preserve tags and stable IDs',()=>{
 const old=[{id:'drive-a',title:'old',tags:['Favorites']}];
 const result=mergePhotos(old,[{id:'drive-a',title:'new',tags:[]},{id:'drive-b',tags:[]}]);
 assert.equal(result.length,2);assert.equal(result[0].title,'new');assert.deepEqual(result[0].tags,['Favorites']);
 assert.deepEqual(old[0].tags,['Favorites']);
});
test('normalizing tags avoids case-insensitive duplicates and blanks',()=>assert.deepEqual(normalizeTags([' Nature ','nature','','Campaign']),['Nature','Campaign']));
