from fastapi import FastAPI
from pydantic import BaseModel
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModel
import torch
import threading
# import warnings

app = FastAPI()

# 加载模型
text_model = SentenceTransformer('thenlper/gte-small')
code_tokenizer = AutoTokenizer.from_pretrained('microsoft/codebert-base')
code_model = AutoModel.from_pretrained('microsoft/codebert-base')
code_model.eval()

# Faiss 索引（用 IndexIDMap2 支持删除）
dim = 768
faiss_index = faiss.IndexIDMap2(faiss.IndexFlatL2(dim))
meta_data = {}  # id -> meta
lock = threading.Lock()
next_id = [1]  # 用列表包裹实现可变整型

# ----------- 数据结构 -----------
class TextReq(BaseModel):
    text: str

class CodeReq(BaseModel):
    code: str

class AddReq(BaseModel):
    vector: list
    meta: dict
    id: int = None  # 可指定id，否则自动分配

class SearchReq(BaseModel):
    vector: list
    top_k: int = 5

class DeleteReq(BaseModel):
    id: int

class UpdateReq(BaseModel):
    id: int
    vector: list
    meta: dict = None

# ----------- API 实现 -----------
@app.get("/faiss/meta")
def faiss_meta():
    return {"meta_data": meta_data}

@app.post("/vectorize/text")
def vectorize_text(req: TextReq):
    vec = text_model.encode([req.text])[0]
    return {"vector": vec.tolist()}

@app.post("/vectorize/code")
def vectorize_code(req: CodeReq):
    tokens = code_tokenizer(req.code, return_tensors='pt', truncation=True, max_length=512)
    with torch.no_grad():
        output = code_model(**tokens)
    vec = output.last_hidden_state.mean(dim=1).squeeze().numpy()
    return {"vector": vec.tolist()}

@app.post("/faiss/clear")
def faiss_clear():
    global faiss_index, meta_data, next_id
    faiss_index = faiss.IndexIDMap2(faiss.IndexFlatL2(dim))
    meta_data = {}
    next_id = [1]
    return {"success": True}
    
@app.post("/faiss/add")
def faiss_add(req: AddReq):
    with lock:
        print(f"add: id={req.id}, meta={req.meta}")
        id_ = req.id if req.id is not None else next_id[0]
        if req.id is None:
            next_id[0] += 1
        vec = np.array([req.vector], dtype=np.float32)
        faiss_index.add_with_ids(vec, np.array([id_], dtype=np.int64))
        meta_data[id_] = req.meta
    return {"id": id_}

@app.post("/faiss/search")
def faiss_search(req: SearchReq):
    vec = np.array([req.vector], dtype=np.float32)
    D, I = faiss_index.search(vec, req.top_k)
    print('search D:', D, 'I:', I)
    results = []
    for idx in I[0]:
        if idx in meta_data:
            results.append({"id": int(idx), "meta": meta_data[idx]})
    return {"results": results}

@app.post("/faiss/delete")
def faiss_delete(req: DeleteReq):
    with lock:
        faiss_index.remove_ids(np.array([req.id], dtype=np.int64))
        meta_data.pop(req.id, None)
    return {"success": True}

@app.post("/faiss/update")
def faiss_update(req: UpdateReq):
    with lock:
        faiss_index.remove_ids(np.array([req.id], dtype=np.int64))
        vec = np.array([req.vector], dtype=np.float32)
        faiss_index.add_with_ids(vec, np.array([req.id], dtype=np.int64))
        if req.meta is not None:
            meta_data[req.id] = req.meta
    return {"success": True}

# ----------- 启动入口 -----------
if __name__ == "__main__":
    # warnings.filterwarnings("ignore", category=UserWarning)
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8300)