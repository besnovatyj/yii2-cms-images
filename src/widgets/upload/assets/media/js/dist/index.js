var m=class{constructor(){this.subscriptions=new Map}subscribe(e,t){let a=this.subscriptions.get(e);return a||(a=[],this.subscriptions.set(e,a)),a.push(t),()=>{let r=a.indexOf(t);r!==-1&&(a.splice(r,1),a.length===0&&this.subscriptions.delete(e))}}publish(e,...t){let a=this.subscriptions.get(e);if(a)for(let r of a)r(...t)}};var u=class{constructor(e,t,a,r,i,s="AddImageForm",o=3){this.connector=e;this.headers=t;this.galleryState=a;this.dispatcher=r;this.ownerId=i;this.formName=s;this.currentUploads=0;this.uploadQueue=[];this.uploadStatus=[];this.maxConcurrentUploads=o}async uploadAll(){let e=this.galleryState.getUploadEntries();if(e.length===0)throw new Error("\u041D\u0435\u0442 \u0444\u0430\u0439\u043B\u043E\u0432 \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438");this.uploadStatus=e.map(r=>({uploadId:r.uploadId,fileName:r.file.name,progress:0,status:"pending"}));let t=e.map(r=>this.uploadFileQueued(r.uploadId,r.file).then(()=>({success:!0,fileName:r.file.name})).catch(i=>({success:!1,fileName:r.file.name,error:i instanceof Error?i.message:String(i)}))),a=await Promise.all(t);return{succeeded:a.filter(r=>r.success).length,failed:a.filter(r=>!r.success).map(r=>({fileName:r.fileName,error:r.error}))}}uploadFileQueued(e,t){return new Promise((a,r)=>{this.uploadQueue.push({uploadId:e,file:t,resolve:a,reject:r}),this.processQueue()})}processQueue(){for(;this.currentUploads<this.maxConcurrentUploads&&this.uploadQueue.length>0;){let{uploadId:e,file:t,resolve:a,reject:r}=this.uploadQueue.shift();this.currentUploads++,this.uploadFile(e,t).then(()=>{this.currentUploads--,this.processQueue(),a()}).catch(i=>{this.currentUploads--,this.processQueue(),r(i)})}}uploadFile(e,t){return new Promise((a,r)=>{let i=new XMLHttpRequest,s=new FormData;s.append(`${this.formName}[file]`,t),s.append(`${this.formName}[fileName]`,t.name),s.append(`${this.formName}[id]`,this.ownerId),s.append("method","upload");let o=this.uploadStatus.findIndex(l=>l.uploadId===e);if(o===-1)return r(new Error("\u0424\u0430\u0439\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u0441\u0442\u0430\u0442\u0443\u0441\u0430\u0445 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438"));i.open("POST",this.connector,!0);for(let[l,d]of Object.entries(this.headers))i.setRequestHeader(l,d);i.upload.onprogress=l=>{if(l.lengthComputable){let d=Math.round(l.loaded/l.total*100);this.updateUploadStatus(o,{progress:d,status:"uploading"})}},i.onload=()=>{if(i.status>=200&&i.status<300)try{let l=JSON.parse(i.responseText);if(l.status==="success")this.updateUploadStatus(o,{progress:100,status:"completed"}),a();else{let d=l.message??l.data?.message??"\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430";this.updateUploadStatus(o,{progress:0,status:"failed",error:d}),r(new Error(d))}}catch{this.updateUploadStatus(o,{progress:0,status:"failed",error:"\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u043E\u0442\u0432\u0435\u0442\u0430"}),r(new Error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u043E\u0442\u0432\u0435\u0442\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430"))}else this.updateUploadStatus(o,{progress:0,status:"failed",error:i.statusText}),r(new Error(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438: ${i.status}: ${i.statusText}`))},i.onerror=()=>{this.updateUploadStatus(o,{progress:0,status:"failed",error:"\u0421\u0435\u0442\u0435\u0432\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430"}),r(new Error("\u0421\u0435\u0442\u0435\u0432\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430"))},i.send(s)})}updateUploadStatus(e,t){this.uploadStatus[e]={...this.uploadStatus[e],...t},this.dispatcher.publish("FileUploader:UploadStatusUpdate",this.uploadStatus)}};var g=class{constructor(e,t,a,r,i){this.model=e;this.view=t;this.service=a;this.fileUploader=r;this.dispatcher=i;this.setupEventListeners()}async init(){this.view.preloaderAction("start");try{this.model.serverImages=await this.service.getImages(),this.view.render(this.model)}catch(e){console.error(e);let t=e instanceof Error?e.message:String(e);showAlert({message:`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F: ${t}`,type:"error",duration:0})}finally{this.view.preloaderAction("stop")}}setupEventListeners(){this.dispatcher.subscribe("VIEW.FILES_DROPPED",e=>this.handleFilesAdded(e)),this.dispatcher.subscribe("VIEW.FILES_SELECTED",e=>this.handleFilesAdded(e)),this.dispatcher.subscribe("VIEW.IMAGE_DELETED",e=>this.handleImageDeleted(e)),this.dispatcher.subscribe("VIEW.SORT_CHANGED",e=>this.handleServerSortChanged(e)),this.dispatcher.subscribe("VIEW.UPLOAD_SORT_CHANGED",e=>this.handleUploadSortChanged(e)),this.dispatcher.subscribe("VIEW.UPLOAD_CLICKED",()=>this.handleUploadClicked()),this.dispatcher.subscribe("VIEW.CLEAR_CLICKED",()=>this.handleClearClicked()),this.dispatcher.subscribe("VIEW.SET_MAIN_IMAGE",e=>this.handleSetMainImage(e)),this.dispatcher.subscribe("FileUploader:UploadStatusUpdate",e=>this.handleUploadStatusUpdate(e))}async handleFilesAdded(e){let t=await this.model.addUploadImages(e);if(t.errors.length===1)showAlert({message:t.errors[0].message,type:"error",duration:0});else if(t.errors.length>1){let a=t.errors.map(r=>r.fileName).join(", ");showAlert({message:`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C ${t.errors.length} \u0444\u0430\u0439\u043B\u043E\u0432: ${a}`,type:"error",duration:0})}this.view.render(this.model)}async handleImageDeleted(e){if(e.type==="server"){this.view.preloaderAction("start","delete");try{await this.service.deleteImage(e.id);let a=this.model.serverImages.find(r=>r.id===e.id)?.isMain??!1;this.model.serverImages=this.model.serverImages.filter(r=>r.id!==e.id),a&&this.model.serverImages.length>0&&(this.model.serverImages=this.model.serverImages.map((r,i)=>({...r,isMain:i===0}))),this.view.render(this.model)}catch(t){let a=t instanceof Error?t.message:String(t);showAlert({message:`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435: ${a}`,type:"error",duration:0})}this.view.preloaderAction("stop")}else this.model.removeUploadImage(e.id),this.view.render(this.model)}async handleServerSortChanged(e){this.view.topBarAction("indeterminate");try{await this.service.setNewSort(e);let t=new Map(e.map(a=>[a.id,a.sort]));this.model.serverImages=this.model.serverImages.map(a=>({...a,sort:t.get(a.id)||a.sort})),this.model.serverImages.sort((a,r)=>a.sort-r.sort),this.view.render(this.model)}catch(t){let a=t instanceof Error?t.message:String(t);showAlert({message:`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u043D\u043E\u0432\u044B\u0439 \u043F\u043E\u0440\u044F\u0434\u043E\u043A: ${a}`,type:"error",duration:0}),this.view.topBarAction("complete")}}handleUploadSortChanged(e){this.model.reorderUploadImages(e),this.view.render(this.model)}async handleUploadClicked(){if(this.model.uploadImages.length===0){showAlert({message:"\u041D\u0435\u0442 \u0444\u0430\u0439\u043B\u043E\u0432 \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438",type:"warning"});return}this.model.isUploading=!0,this.view.render(this.model);try{let e=await this.fileUploader.uploadAll();this.model.serverImages=await this.service.getImages(),this.model.clearUploadImages(),this.model.isUploading=!1,this.view.render(this.model),e.failed.length===0?showAlert({message:"\u0412\u0441\u0435 \u0444\u0430\u0439\u043B\u044B \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B",type:"success"}):e.succeeded>0?showAlert({message:`\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E ${e.succeeded} \u0438\u0437 ${e.succeeded+e.failed.length} \u0444\u0430\u0439\u043B\u043E\u0432. \u041E\u0448\u0438\u0431\u043A\u0438: ${e.failed.map(t=>t.fileName).join(", ")}`,type:"warning",duration:0}):showAlert({message:`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u0430\u0439\u043B\u044B: ${e.failed.map(t=>t.fileName).join(", ")}`,type:"error",duration:0})}catch(e){this.model.isUploading=!1,this.view.render(this.model);let t=e instanceof Error?e.message:String(e);showAlert({message:`\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438: ${t}`,type:"error",duration:0})}}handleClearClicked(){this.model.clearUploadImages(),this.view.render(this.model)}async handleSetMainImage(e){this.view.topBarAction("indeterminate");try{await this.service.setMainImage(e.id),this.model.serverImages=this.model.serverImages.map(t=>({...t,isMain:t.id===e.id})),this.view.render(this.model)}catch(t){let a=t instanceof Error?t.message:String(t);showAlert({message:`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0433\u043B\u0430\u0432\u043D\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435: ${a}`,type:"error",duration:0}),this.view.topBarAction("complete")}}handleUploadStatusUpdate(e){this.model.updateUploadStatus(e),this.view.render(this.model)}};var v=class{constructor(e=1920,t=1080){this.maxWidth=e;this.maxHeight=t;this.isUploading=!1;this.overallProgress=0;this._filesToUploadList=null;this.nextUploadId=0;this._serverImages=[];this._uploadImages=[]}get serverImages(){return this._serverImages}set serverImages(e){this._serverImages=e}get uploadImages(){return this._uploadImages}async getImageResolution(e){return new Promise((t,a)=>{let r=new Image;r.src=URL.createObjectURL(e),r.onload=()=>{URL.revokeObjectURL(r.src),t({width:r.width,height:r.height})},r.onerror=()=>{URL.revokeObjectURL(r.src),a(new Error(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F ${e.name}`))}})}async addUploadImages(e){let t=[],a=[];for(let r=0;r<e.length;r++){let i=e[r];try{try{let{width:s,height:o}=await this.getImageResolution(i);if(s>this.maxWidth||o>this.maxHeight){a.push({fileName:i.name,message:`\u0424\u0430\u0439\u043B ${i.name} \u043F\u0440\u0435\u0432\u044B\u0448\u0430\u0435\u0442 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435 ${this.maxWidth}x${this.maxHeight} \u043F\u0438\u043A\u0441\u0435\u043B\u0435\u0439 (\u0444\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0435: ${s}x${o})`});continue}}catch{}t.push(i),this._uploadImages.push({kind:"upload",id:this.nextUploadId++,file:e[r],status:"pending",progress:0})}catch(s){let o=s instanceof Error?s.message:String(s);a.push({fileName:i.name,message:`\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0444\u0430\u0439\u043B\u0430 ${i.name}: ${o}`})}}return this.setFilesToUpload(t),{validFiles:t,errors:a}}removeUploadImage(e){this._uploadImages=this._uploadImages.filter(a=>a.id!==e);let t=this._uploadImages.map(a=>a.file);this.setFilesToUpload(t)}getUploadEntries(){return this._uploadImages.filter(e=>e.status==="pending"||e.status==="uploading").map(e=>({uploadId:e.id,file:e.file}))}getFilesToUpload(){return this._filesToUploadList}clearUploadImages(){this._uploadImages=[],this.setFilesToUpload([])}updateUploadStatus(e){e.forEach(r=>{let i=this._uploadImages.find(s=>s.id===r.uploadId);i&&(i.status=r.status,i.progress=r.progress,i.error=r.error)});let t=this._uploadImages.length,a=this._uploadImages.filter(r=>r.status==="completed"||r.status==="failed").length;this.overallProgress=t>0?a/t*100:0}reorderUploadImages(e){this._uploadImages=e.map(t=>this._uploadImages.find(a=>a.id===t))}setFilesToUpload(e){let t=new DataTransfer;e.forEach(a=>t.items.add(a)),this._filesToUploadList=t.files}};var f=class{constructor(e,t,a,r){this.headers=e;this.endpoints=t;this.ownerId=a;this.formNames=r}async getImages(){try{let e=new FormData;e.append(`${this.formNames.getImagesForm}[id]`,this.ownerId);let t=await fetch(this.endpoints.getImages,{method:"POST",headers:this.headers,body:e}),a=await this.handleResponse(t);if(typeof a!="object"||a===null)throw console.error("\u0414\u0430\u043D\u043D\u044B\u0435 \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u0430 \u043D\u0435 \u044F\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C:",a),new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u0430");let r=Object.keys(a).filter(i=>!isNaN(Number(i))).map(i=>a[i]);return r.length===0?(console.warn("\u0421\u0435\u0440\u0432\u0435\u0440 \u0432\u0435\u0440\u043D\u0443\u043B \u0443\u0441\u043F\u0435\u0448\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442, \u043D\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442:",a),[]):r.sort((i,s)=>i.sort-s.sort)}catch(e){throw console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0432 getImages:",e),e}}async deleteImage(e){try{let t=new FormData;t.append(`${this.formNames.deleteImageForm}[id]`,this.ownerId),t.append(`${this.formNames.deleteImageForm}[imageId]`,String(e));let a=await fetch(this.endpoints.deleteImage,{method:"POST",headers:this.headers,body:t});await this.handleResponse(a)}catch(t){throw console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0432 deleteImage:",t),t}}async setMainImage(e){try{let t=new FormData;t.append(`${this.formNames.setMainImageForm}[id]`,this.ownerId),t.append(`${this.formNames.setMainImageForm}[imageId]`,String(e));let a=await fetch(this.endpoints.setMainImage,{method:"POST",headers:this.headers,body:t});await this.handleResponse(a)}catch(t){throw console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0432 setMainImage:",t),t}}async setNewSort(e){try{let t=new FormData;t.append(`${this.formNames.setNewSortForm}[id]`,this.ownerId),t.append(`${this.formNames.setNewSortForm}[sortOrder]`,JSON.stringify(e));let a=await fetch(this.endpoints.setNewSort,{method:"POST",headers:this.headers,body:t});await this.handleResponse(a)}catch(t){throw console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0432 setNewSort:",t),t}}async handleResponse(e){if(!e.ok)throw new Error(`HTTP \u043E\u0448\u0438\u0431\u043A\u0430 ${e.status}: ${e.statusText}`);let t=await e.json();if(t.status==="error"){let a=t.data,r=`\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430: ${t.message||a.message||"\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430"}`;throw console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430:",{message:a.message,file:a.file,line:a.line,code:a.code}),new Error(r)}if(t.status!=="success")throw console.error("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u043E\u0442\u0432\u0435\u0442\u0430:",t.status),new Error("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u043E\u0442\u0432\u0435\u0442\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430");return t.data}};var c=class extends HTMLElement{constructor(e){super(),this.dispatcher=e,this.attachShadow({mode:"open"}),this.fileInput=document.createElement("input"),this.fileInput.type="file",this.fileInput.multiple=!0,this.fileInput.accept="image/*",this.fileInput.style.display="none",this.fileInput.addEventListener("change",this.handleFileSelect.bind(this));let t=document.createElement("style");t.textContent=`
            :host {
                display: block;
                width: 100%;
                border: 2px dashed #d1d5db;
                border-radius: 12px;
                background: #fafafa;
                text-align: center;
                padding: 28px 16px;
                box-sizing: border-box;
                cursor: pointer;
                transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;
                user-select: none;
            }
            :host(:hover) {
                border-color: #4f7df3;
                background: #f0f5ff;
            }
            :host([dragover]) {
                border-color: #3b82f6;
                background: #dbeafe;
                transform: scale(1.008);
            }
            .drop-icon {
                color: #9ca3af;
                margin-bottom: 10px;
                transition: color 0.2s ease;
                display: block;
            }
            :host(:hover) .drop-icon,
            :host([dragover]) .drop-icon {
                color: #4f7df3;
            }
            .drop-title {
                font-size: 0.95em;
                font-weight: 600;
                color: #374151;
                margin: 0 0 4px;
            }
            .drop-hint {
                font-size: 0.78em;
                color: #9ca3af;
                margin: 0;
            }
        `;let a=document.createElement("span");a.className="drop-icon",a.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 16 16">
            <path d="M6.502 7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
            <path d="M14 14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM4 1a1 1 0 0 0-1 1v10l2.224-2.224a.5.5 0 0 1 .61-.075L8 11l2.157-3.02a.5.5 0 0 1 .76-.063L13 10V4.5h-2A1.5 1.5 0 0 1 9.5 3V1z"/>
        </svg>`;let r=document.createElement("p");r.className="drop-title";let i=document.createElement("p");i.className="drop-hint",window.FileReader?(r.textContent="\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0441\u044E\u0434\u0430",i.textContent="\u0438\u043B\u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u0432\u044B\u0431\u043E\u0440\u0430 \u0444\u0430\u0439\u043B\u043E\u0432"):(r.textContent="\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0444\u0430\u0439\u043B\u043E\u0432 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u043E\u043C",i.textContent="\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u0434\u043E \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438"),this.shadowRoot?.appendChild(t),this.shadowRoot?.appendChild(a),this.shadowRoot?.appendChild(r),this.shadowRoot?.appendChild(i),this.shadowRoot?.appendChild(this.fileInput),this.addEventListener("dragenter",this.handleDragEnter.bind(this)),this.addEventListener("dragleave",this.handleDragLeave.bind(this)),this.addEventListener("dragover",this.handleDragOver.bind(this)),this.addEventListener("drop",this.handleDrop.bind(this)),this.addEventListener("click",this.handleClick.bind(this))}handleDragEnter(e){e.preventDefault(),e.stopPropagation(),this.setAttribute("dragover","")}handleDragLeave(e){e.preventDefault(),e.stopPropagation(),this.removeAttribute("dragover")}handleDragOver(e){e.preventDefault(),e.stopPropagation(),e.dataTransfer&&(e.dataTransfer.dropEffect="copy")}handleDrop(e){e.preventDefault(),e.stopPropagation(),this.removeAttribute("dragover"),e.dataTransfer?.files&&this.dispatcher.publish("VIEW.FILES_DROPPED",e.dataTransfer.files)}handleClick(){this.fileInput.click()}handleFileSelect(e){this.fileInput.files&&this.dispatcher.publish("VIEW.FILES_SELECTED",this.fileInput.files)}};customElements.define("dropzone-wc",c);var b=class extends HTMLElement{constructor(t){super();this.dispatcher=t;this.attachShadow({mode:"open"}),this.render(),this.uploadBtn=this.shadowRoot.querySelector("#gallery-upload-btn"),this.clearBtn=this.shadowRoot.querySelector("#gallery-clear-btn"),this.setupEventListeners()}render(){this.shadowRoot.innerHTML=`
            <style>
                .controls-container {
                    display: flex;
                    gap: 8px;
                    padding: 10px 0 2px;
                }
                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 7px 14px;
                    font-size: 13px;
                    font-weight: 500;
                    border: none;
                    border-radius: 7px;
                    cursor: pointer;
                    transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
                    line-height: 1;
                    letter-spacing: 0.01em;
                }
                .btn:active {
                    transform: scale(0.97);
                }
                .btn-upload {
                    background: #4f7df3;
                    color: #fff;
                    box-shadow: 0 1px 3px rgba(79,125,243,0.35);
                }
                .btn-upload:hover {
                    background: #3b6de0;
                    box-shadow: 0 3px 8px rgba(79,125,243,0.45);
                }
                .btn-clear {
                    background: #f3f4f6;
                    color: #6b7280;
                    border: 1px solid #e5e7eb;
                    padding: 6px 14px;
                }
                .btn-clear:hover {
                    background: #e9eaec;
                    color: #4b5563;
                }
                svg {
                    flex-shrink: 0;
                }
            </style>
            <div class="controls-container">
                <button id="gallery-upload-btn" type="button" class="btn btn-upload">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
                        <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z"/>
                    </svg>
                    \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C
                </button>
                <button id="gallery-clear-btn" type="button" class="btn btn-clear">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"/>
                    </svg>
                    \u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C
                </button>
            </div>
        `}setupEventListeners(){this.uploadBtn.addEventListener("click",t=>{t.preventDefault(),this.dispatcher.publish("VIEW.UPLOAD_CLICKED")}),this.clearBtn.addEventListener("click",t=>{t.preventDefault(),this.dispatcher.publish("VIEW.CLEAR_CLICKED")})}};customElements.define("controls-component",b);var y=class{constructor(e,t,a){this.container=e;this.type=t;this.dispatcher=a;this.touchDragState=null;this.boundTouchMove=null;this.boundTouchEnd=null;this.touchInteractionActive=!1;this.draggedId=null;this.dragOriginalNextSibling=null;this.setupEventListeners()}setupEventListeners(){this.container.addEventListener("dragstart",e=>{if(this.touchInteractionActive){e.preventDefault();return}this.handleDragStart(e)}),this.container.addEventListener("dragover",e=>{if(this.touchInteractionActive){e.preventDefault();return}this.handleDragOver(e)}),this.container.addEventListener("drop",e=>{if(this.touchInteractionActive){e.preventDefault();return}this.handleDrop(e)}),this.container.addEventListener("dragend",()=>{if(this.touchInteractionActive){this.forceEndTouchDrag();return}this.handleDragEnd()}),this.container.addEventListener("touchstart",e=>this.handleTouchStart(e),{passive:!1})}handleDragStart(e){e.stopPropagation();let a=e.target.closest(`.${this.type}-image`);if(!a){console.warn(`\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u0441 \u043A\u043B\u0430\u0441\u0441\u043E\u043C ${this.type}-image`);return}let r=a.dataset.id;if(!r||isNaN(Number(r))){console.warn(`\u042D\u043B\u0435\u043C\u0435\u043D\u0442 ${this.type}-image \u0438\u043C\u0435\u0435\u0442 \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 data-id:`,r);return}this.draggedId=r,this.dragOriginalNextSibling=a.nextSibling,a.classList.add("dragging"),e.dataTransfer?.setData("text/plain",r)}handleDragOver(e){if(e.preventDefault(),!this.draggedId)return;let t=e.target instanceof HTMLElement?e.target.closest(`.${this.type}-image`):null;if(!t)return;let a=this.container.querySelector(`[data-id="${this.draggedId}"]`);!a||t===a||this.insertAtCursorPosition(a,t,e.clientX)}handleDrop(e){if(e.preventDefault(),e.stopPropagation(),!this.draggedId)return;this.container.querySelector(`[data-id="${this.draggedId}"]`)?.classList.remove("dragging"),this.draggedId=null,this.dragOriginalNextSibling=null,this.dispatchSortEvent()}handleDragEnd(){if(!this.draggedId)return;let e=this.container.querySelector(`[data-id="${this.draggedId}"]`);e&&(e.classList.remove("dragging"),this.container.insertBefore(e,this.dragOriginalNextSibling)),this.draggedId=null,this.dragOriginalNextSibling=null}handleTouchStart(e){let t=e.touches[0],a=t.target;if(a.closest(".main-image-btn")||a.closest(".delete-btn")||!a.closest(".drag-handle"))return;let r=a.closest(`.${this.type}-image`);if(!r)return;e.preventDefault(),this.touchInteractionActive=!0;let i=r.getBoundingClientRect();this.touchDragState={draggedEl:r,clone:null,startX:t.clientX,startY:t.clientY,offsetX:t.clientX-i.left,offsetY:t.clientY-i.top,isDragging:!1,originalNextSibling:r.nextSibling},this.boundTouchMove=s=>this.handleTouchMove(s),this.boundTouchEnd=s=>this.handleTouchEnd(s),document.addEventListener("touchmove",this.boundTouchMove,{passive:!1}),document.addEventListener("touchend",this.boundTouchEnd),document.addEventListener("touchcancel",this.boundTouchEnd)}handleTouchMove(e){if(!this.touchDragState)return;e.preventDefault();let t=e.touches[0],a=t.clientX-this.touchDragState.startX,r=t.clientY-this.touchDragState.startY;if(!this.touchDragState.isDragging){if(Math.sqrt(a*a+r*r)<8)return;this.touchDragState.isDragging=!0,this.touchDragState.clone=this.createDragClone(this.touchDragState.draggedEl),this.touchDragState.draggedEl.classList.add("dragging")}let{clone:i,offsetX:s,offsetY:o,draggedEl:l}=this.touchDragState;i.style.left=`${t.clientX-s}px`,i.style.top=`${t.clientY-o}px`;let d=this.findImageAtPoint(t.clientX,t.clientY);d&&d!==l&&this.insertAtCursorPosition(l,d,t.clientX)}handleTouchEnd(e){if(this.touchInteractionActive=!1,this.cleanupTouchListeners(),!this.touchDragState)return;let t=this.touchDragState;this.touchDragState=null,t.isDragging&&(t.clone.remove(),t.draggedEl.classList.remove("dragging"),this.dispatchSortEvent())}forceEndTouchDrag(){if(this.touchInteractionActive=!1,this.cleanupTouchListeners(),!this.touchDragState)return;let e=this.touchDragState;this.touchDragState=null,e.isDragging&&e.clone&&e.clone.remove(),e.draggedEl.classList.remove("dragging")}insertAtCursorPosition(e,t,a){let r=t.getBoundingClientRect();a<r.left+r.width/2?e.nextSibling!==t&&this.container.insertBefore(e,t):t.nextSibling!==e&&this.container.insertBefore(e,t.nextSibling)}findImageAtPoint(e,t){let a=Array.from(this.container.querySelectorAll(`.${this.type}-image`));for(let r of a){let i=r.getBoundingClientRect();if(e>=i.left&&e<=i.right&&t>=i.top&&t<=i.bottom)return r}return null}createDragClone(e){let t=e.getBoundingClientRect(),a=e.querySelector("img"),r=document.createElement("div");if(r.style.cssText=`
            position: fixed;
            width: ${t.width}px;
            height: ${t.height}px;
            left: ${t.left}px;
            top: ${t.top}px;
            z-index: 99999;
            pointer-events: none;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            transform: scale(1.06) rotate(1deg);
            opacity: 0.92;
            transition: none;
        `,a){let i=document.createElement("img");i.src=a.src;let s=getComputedStyle(a).objectFit||"cover";i.style.cssText=`width:100%;height:100%;object-fit:${s};display:block;`,r.appendChild(i)}else r.style.background="#d1d5db";return document.body.appendChild(r),r}dispatchSortEvent(){let e=this.container;if(this.type==="server"){let t=Array.from(e.children).filter(a=>a.dataset.id).map((a,r)=>({id:parseInt(a.dataset.id,10),sort:r}));this.dispatcher.publish("VIEW.SORT_CHANGED",t)}else{let t=Array.from(e.children).filter(a=>a.dataset.id).map(a=>parseInt(a.dataset.id,10));this.dispatcher.publish("VIEW.UPLOAD_SORT_CHANGED",t)}}cleanupTouchListeners(){this.boundTouchMove&&(document.removeEventListener("touchmove",this.boundTouchMove),this.boundTouchMove=null),this.boundTouchEnd&&(document.removeEventListener("touchend",this.boundTouchEnd),document.removeEventListener("touchcancel",this.boundTouchEnd),this.boundTouchEnd=null)}};var E=class n{static createImageElement(e,t,a,r=null,i="cover"){let s=n.createContainer(e,r,i);return n.updateImage(s,e,i),n.createMainImageButton(s,e,a),n.createDragHandle(s),n.createDeleteButton(s,e,a),s}static createContainer(e,t,a="cover"){let r=t||document.createElement("div"),i=a==="contain"?" fit-contain":"";return r.className=`gallery-image ${e.kind}-image${i}`,r.draggable=!0,r.dataset.id=e.id.toString(),r.style.position="relative",r}static updateImage(e,t,a="cover"){let r=e.querySelector("img");r||(r=document.createElement("img"),e.appendChild(r)),r.dataset.objectUrl&&(URL.revokeObjectURL(r.dataset.objectUrl),delete r.dataset.objectUrl),t.kind==="server"?(r.src=t.previewUrl,r.alt=t.fileName):(r.src=URL.createObjectURL(t.file),r.alt=t.file.name,r.dataset.objectUrl=r.src),r.style.width="100%",r.style.height="100%",r.style.objectFit=a,r.style.display="block"}static createMainImageButton(e,t,a){if(t.kind!=="server")return;let r=e.querySelector(".main-image-btn");if(!r){r=document.createElement("button"),r.className="main-image-btn",r.type="button",r.title="\u0421\u0434\u0435\u043B\u0430\u0442\u044C \u0433\u043B\u0430\u0432\u043D\u044B\u043C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435\u043C",r.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg>',e.appendChild(r);let i=t.id;r.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation(),a.publish("VIEW.SET_MAIN_IMAGE",{id:i})})}r.classList.toggle("is-main",t.isMain)}static createDragHandle(e){if(e.querySelector(".drag-handle"))return;let t=document.createElement("button");t.className="drag-handle",t.type="button",t.title="\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u0434\u043B\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u043F\u043E\u0440\u044F\u0434\u043A\u0430",t.setAttribute("aria-label","\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u044C \u0434\u043B\u044F \u0441\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0438"),t.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>',e.appendChild(t),t.addEventListener("click",a=>{a.preventDefault(),a.stopPropagation()})}static createDeleteButton(e,t,a){let r=e.querySelector(".delete-btn");r||(r=document.createElement("button"),r.className="delete-btn",r.type="button",r.title="\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435",r.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
 <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>
</svg>`,e.appendChild(r),r.addEventListener("click",i=>{i.preventDefault(),a.publish("VIEW.IMAGE_DELETED",{type:t.kind,id:t.id});let s=e.querySelector("img");s?.dataset.objectUrl&&URL.revokeObjectURL(s.dataset.objectUrl)}))}};var p=class extends HTMLElement{constructor(t,a,r=1,i="",s="cover"){super();this.dispatcher=t;this.type=a;this.previewFit=s,this.imageSize=100*r,this.style.setProperty("--image-size",`${this.imageSize}px`),this.attachShadow({mode:"open"});let o=document.createElement("style");o.textContent=`
            /* \u041A\u0430\u0441\u0442\u043E\u043C\u043D\u044B\u0439 \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E display:inline \u2014 \u044F\u0432\u043D\u043E \u0440\u0430\u0441\u0442\u044F\u0433\u0438\u0432\u0430\u0435\u043C \u043D\u0430 \u0432\u0441\u044E \u0448\u0438\u0440\u0438\u043D\u0443 \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u044F */
            :host {
                display: block;
                width: 100%;
            }

            /* === \u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0441\u0435\u043A\u0446\u0438\u0438 === */
            .section-label {
                font-size: 0.72em;
                font-weight: 600;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: #9ca3af;
                margin: 0 0 8px;
                display: none;
                align-items: center;
                gap: 8px;
            }
            .section-label::after {
                content: '';
                flex: 1;
                height: 1px;
                background: #e5e7eb;
            }
            .section-label.visible {
                display: flex;
            }

            /* === \u0421\u0435\u0442\u043A\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 === */
            /* auto-fill: \u0441\u0442\u043E\u043B\u044C\u043A\u043E \u043A\u043E\u043B\u043E\u043D\u043E\u043A, \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0435\u0437\u0430\u0435\u0442; 1fr: \u0432\u0441\u0435 \u043A\u043E\u043B\u043E\u043D\u043A\u0438 \u0440\u0430\u0432\u043D\u043E\u0439 \u0448\u0438\u0440\u0438\u043D\u044B */
            .gallery-section {
                position: relative;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(var(--image-size), 1fr));
                gap: 4px;
                padding: 2px 0 4px;
            }

            /* === \u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F === */
            .gallery-image {
                /* \u0420\u0430\u0437\u043C\u0435\u0440 \u0437\u0430\u0434\u0430\u0451\u0442\u0441\u044F grid-\u044F\u0447\u0435\u0439\u043A\u043E\u0439; aspect-ratio \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442 \u043A\u0432\u0430\u0434\u0440\u0430\u0442\u043D\u0443\u044E \u0444\u043E\u0440\u043C\u0443 */
                width: 100%;
                aspect-ratio: 1;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 2px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05);
                transition: transform 0.18s ease, box-shadow 0.18s ease;
                cursor: grab;
                background: #e9ecef;
                border: 1.5px solid transparent;
            }
            .gallery-image:hover {
                transform: translateY(-3px) scale(1.02);
                box-shadow: 0 8px 20px rgba(0,0,0,0.12), 0 3px 6px rgba(0,0,0,0.08);
                z-index: 2;
            }
            .gallery-image:active {
                cursor: grabbing;
                transform: scale(0.98);
            }

            /* \u0412\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0445 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u043E\u0436\u0438\u0434\u0430\u044E\u0449\u0438\u0445 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 */
            .upload-image {
                border-color: #93c5fd;
            }

            /* \u0420\u0435\u0436\u0438\u043C contain: \u043F\u0440\u0435\u0432\u044C\u044E \u0432\u043F\u0438\u0441\u0430\u043D\u043E \u0441 \u043F\u043E\u043B\u044F\u043C\u0438. \u0414\u0430\u0451\u043C \u043F\u043B\u0438\u0442\u043A\u0435 \u0432\u0438\u0434\u0438\u043C\u044B\u0439 \u043A\u043E\u043D\u0442\u0443\u0440 \u0438
               \u043F\u043E\u0434\u043B\u043E\u0436\u043A\u0443, \u0438\u043D\u0430\u0447\u0435 \u0441\u0435\u0440\u044B\u0435 \u043F\u043E\u043B\u044F \u0441\u043E\u0441\u0435\u0434\u043D\u0438\u0445 \u043F\u0440\u0435\u0432\u044C\u044E \u0441\u043B\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0447\u0435\u0440\u0435\u0437 4px-\u0437\u0430\u0437\u043E\u0440
               \u0433\u0440\u0438\u0434\u0430 \u0438 \u043F\u0440\u043E\u043C\u0435\u0436\u0443\u0442\u043A\u0438 \u0432\u0438\u0437\u0443\u0430\u043B\u044C\u043D\u043E \u043F\u0440\u043E\u043F\u0430\u0434\u0430\u044E\u0442 (\u0432 cover \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0438 \u0432\u0441\u0442\u044B\u043A \u2014 \u0437\u0430\u0437\u043E\u0440
               \u0432\u0438\u0434\u0435\u043D \u0441\u0430\u043C \u043F\u043E \u0441\u0435\u0431\u0435). \u041A\u043E\u043D\u0442\u0443\u0440 \u2014 \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u0435\u0440\u0432\u0435\u0440\u043D\u044B\u043C \u043F\u043B\u0438\u0442\u043A\u0430\u043C: \u0443 upload \u0443\u0436\u0435 \u0441\u0432\u043E\u0439. */
            .gallery-image.fit-contain {
                background: #f3f4f6;
            }
            .server-image.fit-contain {
                border-color: #e5e7eb;
            }

            /* \u041F\u0435\u0440\u0435\u0442\u0430\u0441\u043A\u0438\u0432\u0430\u0435\u043C\u044B\u0439 \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u2014 \u043D\u0435\u0432\u0438\u0434\u0438\u043C\u044B\u0439 \u0441\u043B\u043E\u0442, \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0449\u0438\u0439 \u0431\u0443\u0434\u0443\u0449\u0443\u044E \u043F\u043E\u0437\u0438\u0446\u0438\u044E */
            .gallery-image.dragging {
                opacity: 0;
                pointer-events: none;
            }

            /* === \u041A\u043D\u043E\u043F\u043A\u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439 === */
            .main-image-btn,
            .delete-btn,
            .drag-handle {
                position: absolute;
                opacity: 0;
                transition: opacity 0.18s ease, transform 0.18s ease, background 0.15s ease;
                transform: scale(0.8);
                border: none;
                cursor: pointer;
                padding: 4px 5px 3px;
                line-height: 1;
                border-radius: 5px;
                z-index: 3;
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
            }
            .gallery-image:hover .main-image-btn,
            .gallery-image:hover .delete-btn,
            .gallery-image:hover .drag-handle {
                opacity: 1;
                transform: scale(1);
            }

            /* \u0417\u0432\u0435\u0437\u0434\u0430 \u2014 \u0433\u043B\u0430\u0432\u043D\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 */
            .main-image-btn {
                top: 5px;
                left: 5px;
                background: rgba(17,24,39,0.45);
                color: #fff;
            }
            .main-image-btn:hover {
                background: rgba(245,158,11,0.92) !important;
                color: #1c1401 !important;
            }
            /* \u0412\u0441\u0435\u0433\u0434\u0430 \u0432\u0438\u0434\u0438\u043C\u0430 \u0438 \u0437\u043E\u043B\u043E\u0442\u0430\u044F \u0434\u043B\u044F \u0433\u043B\u0430\u0432\u043D\u043E\u0433\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F */
            .main-image-btn.is-main {
                opacity: 1 !important;
                transform: scale(1) !important;
                background: rgba(245,158,11,0.9) !important;
                color: #1c1401 !important;
            }

            /* \u041D\u0430 \u0442\u0430\u0447-\u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430\u0445 hover \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u2014 \u043A\u043D\u043E\u043F\u043A\u0438 \u0432\u0441\u0435\u0433\u0434\u0430 \u0432\u0438\u0434\u043D\u044B */
            @media (hover: none), (pointer: coarse) {
                .main-image-btn,
                .delete-btn,
                .drag-handle {
                    opacity: 1 !important;
                    transform: scale(1) !important;
                }
            }

            /* \u041A\u043D\u043E\u043F\u043A\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F */
            .delete-btn {
                bottom: 5px;
                right: 5px;
                background: rgba(17,24,39,0.45);
                color: #fff;
            }
            .delete-btn:hover {
                background: rgba(239,68,68,0.92) !important;
            }

            /* \u041C\u0430\u0440\u043A\u0435\u0440 \u043F\u0435\u0440\u0435\u0442\u0430\u0441\u043A\u0438\u0432\u0430\u043D\u0438\u044F \u2014 \u043D\u0438\u0437-\u0441\u043B\u0435\u0432\u0430, \u0437\u0435\u0440\u043A\u0430\u043B\u044C\u043D\u043E \u043A\u043D\u043E\u043F\u043A\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F.
               \u041D\u0430 \u0442\u0430\u0447-\u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430\u0445 \u0438\u043C\u0435\u043D\u043D\u043E \u0441 \u043D\u0435\u0433\u043E \u043D\u0430\u0447\u0438\u043D\u0430\u0435\u0442\u0441\u044F \u043F\u0435\u0440\u0435\u0442\u0430\u0441\u043A\u0438\u0432\u0430\u043D\u0438\u0435 (\u0441\u043C.
               DragAndDropManager): \u043A\u0430\u0441\u0430\u043D\u0438\u0435 \u0442\u0435\u043B\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u043F\u0440\u0438 \u044D\u0442\u043E\u043C \u0441\u043A\u0440\u043E\u043B\u043B\u0438\u0442 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443. */
            .drag-handle {
                bottom: 5px;
                left: 5px;
                background: rgba(17,24,39,0.45);
                color: #fff;
                cursor: grab;
                touch-action: none; /* \u043F\u0430\u043B\u0435\u0446 \u043D\u0430 \u0440\u0443\u0447\u043A\u0435 \u043D\u0435 \u0438\u043D\u0438\u0446\u0438\u0438\u0440\u0443\u0435\u0442 \u0441\u043A\u0440\u043E\u043B\u043B/\u0437\u0443\u043C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 */
            }
            .drag-handle:active {
                cursor: grabbing;
            }
            .drag-handle:hover {
                background: rgba(59,130,246,0.92) !important;
            }

        `,this.sectionLabel=document.createElement("div"),this.sectionLabel.className="section-label",this.sectionLabel.textContent=i,this.container=document.createElement("div"),this.container.className="gallery-section",this.shadowRoot?.appendChild(o),this.shadowRoot?.appendChild(this.sectionLabel),this.shadowRoot?.appendChild(this.container),this.dragAndDropManager=new y(this.container,this.type,this.dispatcher)}render(t){this.sectionLabel.classList.toggle("visible",t.length>0);let a=new Map;Array.from(this.container.children).forEach(r=>{r.dataset.id&&a.set(r.dataset.id,r)}),t.forEach((r,i)=>{let s=a.get(r.id.toString()),o=E.createImageElement(r,this.imageSize,this.dispatcher,s,this.previewFit);s||this.container.insertBefore(o,this.container.children[i]||null),a.delete(r.id.toString())}),a.forEach(r=>r.remove())}};customElements.define("image-list",p);var h=class extends HTMLElement{constructor(){super();this.container=null;this.iconEl=null;this.titleEl=null;this.subtitleEl=null;this.attachShadow({mode:"open"}),this.build()}build(){let t=document.createElement("style");t.textContent=`
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes trash-wiggle {
                0%, 100% { transform: rotate(0deg) scale(1); }
                25%  { transform: rotate(-15deg) scale(1.1); }
                75%  { transform: rotate(15deg) scale(1.1); }
            }
            @keyframes upload-bounce {
                0%, 100% { transform: translateY(0); }
                50%       { transform: translateY(-8px); }
            }
            .preloader {
                display: none;
                position: absolute;
                inset: 0;
                background: rgba(255,255,255,0.88);
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                border-radius: inherit;
                z-index: 100;
                animation: fadeIn 0.18s ease;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 10px;
            }
            .preloader.visible {
                display: flex;
            }
            @media (max-width: 768px) {
                .preloader {
                    position: fixed;
                    border-radius: 0;
                }
            }
            .icon-wrap {
                width: 64px;
                height: 64px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .icon-wrap svg {
                width: 100%;
                height: 100%;
            }
            .spinner {
                width: 40px;
                height: 40px;
                border: 3px solid #e5e7eb;
                border-top-color: #4f7df3;
                border-radius: 50%;
                animation: spin 0.75s linear infinite;
            }
            .icon-delete {
                color: #ef4444;
                animation: trash-wiggle 0.6s ease-in-out infinite;
            }
            .icon-upload {
                color: #4f7df3;
                animation: upload-bounce 0.8s ease-in-out infinite;
            }
            .title {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 0.9em;
                font-weight: 600;
                color: #374151;
                margin: 0;
            }
            .subtitle {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 0.75em;
                color: #9ca3af;
                margin: 0;
            }
        `,this.container=document.createElement("div"),this.container.className="preloader";let a=document.createElement("div");a.className="icon-wrap",this.iconEl=a,this.titleEl=document.createElement("p"),this.titleEl.className="title",this.subtitleEl=document.createElement("p"),this.subtitleEl.className="subtitle",this.container.appendChild(a),this.container.appendChild(this.titleEl),this.container.appendChild(this.subtitleEl),this.shadowRoot.appendChild(t),this.shadowRoot.appendChild(this.container)}show(t="loading",a){this.applyMode(t,a),this.container.classList.add("visible")}updateProgress(t){this.subtitleEl&&(this.subtitleEl.textContent=`${Math.round(t)}%`)}hide(){this.container.classList.remove("visible")}applyMode(t,a){if(!(!this.iconEl||!this.titleEl||!this.subtitleEl)){if(this.iconEl.innerHTML="",t==="loading"){let r=document.createElement("div");r.className="spinner",this.iconEl.appendChild(r),this.titleEl.textContent="\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...",this.subtitleEl.textContent=""}else if(t==="delete"){let r=document.createElementNS("http://www.w3.org/2000/svg","svg");r.setAttribute("viewBox","0 0 16 16"),r.setAttribute("fill","currentColor"),r.classList.add("icon-delete"),r.innerHTML='<path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>',this.iconEl.appendChild(r),this.titleEl.textContent="\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435...",this.subtitleEl.textContent=""}else if(t==="upload"){let r=document.createElementNS("http://www.w3.org/2000/svg","svg");r.setAttribute("viewBox","0 0 16 16"),r.setAttribute("fill","currentColor"),r.classList.add("icon-upload"),r.innerHTML='<path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/><path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z"/>',this.iconEl.appendChild(r),this.titleEl.textContent="\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...",this.subtitleEl.textContent=a!==void 0?`${Math.round(a)}%`:""}}}};customElements.define("preloader-wc",h);var w=class{constructor(){this.hideTimer=null;let e=document.createElement("style");e.textContent=`
            @keyframes top-bar-shimmer {
                0% { background-position: 200% center; }
                100% { background-position: -200% center; }
            }
            .top-progress-bar {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                z-index: 99999;
                pointer-events: none;
                display: none;
            }
            .top-progress-bar-inner {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, #4f7df3, #10b981);
                transition: width 0.25s ease;
                border-radius: 0 99px 99px 0;
            }
            .top-progress-bar-inner.indeterminate {
                width: 100% !important;
                background: linear-gradient(90deg, #4f7df3 0%, #10b981 50%, #4f7df3 100%);
                background-size: 200% auto;
                animation: top-bar-shimmer 1.5s linear infinite;
                transition: none;
                border-radius: 0;
            }
        `,document.head.appendChild(e),this.bar=document.createElement("div"),this.bar.className="top-progress-bar",this.inner=document.createElement("div"),this.inner.className="top-progress-bar-inner",this.bar.appendChild(this.inner),document.body.appendChild(this.bar)}setProgress(e){this.cancelHideTimer(),this.inner.classList.remove("indeterminate"),this.bar.style.display="block",this.inner.style.width=`${Math.max(0,Math.min(100,e))}%`}setIndeterminate(){this.cancelHideTimer(),this.bar.style.display="block",this.inner.classList.add("indeterminate")}complete(){this.cancelHideTimer(),this.inner.classList.remove("indeterminate"),this.inner.style.width="100%",this.hideTimer=setTimeout(()=>{this.bar.style.display="none",this.inner.style.width="0%"},400)}cancelHideTimer(){this.hideTimer!==null&&(clearTimeout(this.hideTimer),this.hideTimer=null)}};var I=class{constructor(e,t,a,r="cover"){this.dispatcher=t;this.preloader=null;this.topBarActive=!1;this.wasUploading=!1;this.container=document.getElementById(e),this.container.innerHTML="",this.applyContainerStyles(),this.setupComponents(a,r)}applyContainerStyles(){let e=document.createElement("style");e.textContent=`
            .gallery-upload {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                position: relative;
            }
        `,document.head.appendChild(e),this.container.style.display="flex",this.container.style.flexDirection="column",this.container.style.gap="0"}setupComponents(e,t){this.topBar=new w;let a=new b(this.dispatcher),r=new c(this.dispatcher);this.serverImageList=new p(this.dispatcher,"server",e,"\u0412 \u0433\u0430\u043B\u0435\u0440\u0435\u0435",t),this.uploadImageList=new p(this.dispatcher,"upload",e,"\u0412\u044B\u0431\u0440\u0430\u043D\u043E \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438",t),this.preloader=new h;let i=document.createElement("div");i.style.cssText=`
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 12px;
            margin-top: 12px;
            background: #fafafa;
        `,i.append(r,this.uploadImageList,a),this.container.append(this.serverImageList,i,this.preloader)}render(e){this.serverImageList?.render(e.serverImages),this.uploadImageList?.render(e.uploadImages),e.isUploading?(this.wasUploading=!0,this.preloader.show("upload",e.overallProgress),this.topBar.setProgress(e.overallProgress)):(this.preloader.hide(),(this.wasUploading||this.topBarActive)&&(this.topBar.complete(),this.wasUploading=!1,this.topBarActive=!1))}preloaderAction(e,t="loading"){e==="start"?(this.preloader.show(t),this.topBar.setIndeterminate(),this.topBarActive=!0):this.preloader.hide()}topBarAction(e){e==="indeterminate"?(this.topBar.setIndeterminate(),this.topBarActive=!0):(this.topBar.complete(),this.topBarActive=!1)}};function Y(n){let e=new m,t=new v(n.maxWidth||1920,n.maxHeight||1080),a=new f(n.headers,n.endpoints,n.ownerId,n.formNames),r=new u(n.endpoints.upload,n.headers,t,e,n.ownerId,n.formNames.uploadImageForm,3),i=new I(n.containerId,e,n.imageScale||1,n.previewFit||"cover");new g(t,i,a,r,e).init()}export{Y as createGalleryWidget};
//# sourceMappingURL=index.js.map
