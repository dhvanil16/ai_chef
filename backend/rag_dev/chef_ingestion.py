#Ingestion of PDF/CSV cookbooks into FAISS index.

import os
import time
import threading
from dotenv import load_dotenv
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

import requests  
import time

# LangChain & FAISS
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.document_loaders import CSVLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

############################################
# 1. Load Environment Variables
############################################
load_dotenv()
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")

############################################
# 2. Global Config
############################################
PDF_DIR = "pdf_cookbooks"
CSV_DIR = "csv_cookbooks"
INDEX_DIR = "faiss_index"

# Embedding model
embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")

############################################
# 3. Initialize or Load FAISS
############################################
def initialize_vector_db(db_path: str):
    if os.path.exists(db_path):
        vector_db = FAISS.load_local(db_path, embedding_model, allow_dangerous_deserialization=True)
        print("Loaded existing FAISS index.")
    else:
        # Create a new, empty FAISS vector store
        vector_db = FAISS.from_texts([], embedding_model)
        vector_db.save_local(db_path)
        print("Created a new FAISS index.")
    return vector_db

vector_db = initialize_vector_db(INDEX_DIR)

############################################
# 4. File Processing 
############################################
def process_pdf(file_path: str):
    try:
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        if not docs:
            print(f"No content found in PDF: {file_path}")
            return

         # Print a timer message before chunking starts
        start_time = time.time()
        print(f"[{time.strftime('%H:%M:%S')}] Starting to create chunks from '{file_path}'...")

        chunks = split_and_chunk(docs)

        # Optional: Calculate elapsed time for chunk creation
        elapsed_time = time.time() - start_time

        if chunks:
            vector_db.add_documents(chunks)
            vector_db.save_local(INDEX_DIR)
            print(f"Added {len(chunks)} chunk(s) from PDF '{file_path}' to FAISS index (chunking took {elapsed_time:.2f} seconds).")

            # 2) Reload endpoint call
            call_reload_endpoint()
        else:
            print(f"No chunks created from PDF: {file_path}")

    except Exception as e:
        print(f"Error processing PDF '{file_path}': {e}")

def process_csv(file_path: str):
    try:
        loader = CSVLoader(file_path, csv_args={"delimiter": "\t", "quotechar": '"'}, encoding="utf-8-sig")
        docs = loader.load()
        if not docs:
            print(f"No content found in CSV: {file_path}")
            return

        chunks = split_and_chunk(docs)
        if chunks:
            vector_db.add_documents(chunks)
            vector_db.save_local(INDEX_DIR)
            print(f"Added {len(chunks)} chunk(s) from CSV '{file_path}' to FAISS index.")

            # 2) Reload endpoint call
            call_reload_endpoint()
        else:
            print(f"No chunks created from CSV: {file_path}")

    except Exception as e:
        print(f"Error processing CSV '{file_path}': {e}")

def split_and_chunk(docs):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
        separators=["\n\n", "\n", " ", ""]
    )
    return text_splitter.split_documents(docs)

############################################
# 5. Reload Endpoint Helper
############################################
def call_reload_endpoint():
    
    try:
        response = requests.post("http://localhost:8000/reload_index", timeout=5)
        if response.status_code == 200:
            print("FAISS index reloaded successfully.")
        else:
            print(f"Failed to reload FAISS index. Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print(f"Error calling reload endpoint: {e}")

############################################
# 6. Watchdog Event Handler
############################################
class DataIngestionHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory:
            return

        file_path = event.src_path
        print(f"New file detected: {file_path}")

        # Check file extension and process accordingly
        if file_path.lower().endswith(".pdf"):
            process_pdf(file_path)
        elif file_path.lower().endswith(".csv"):
            process_csv(file_path)
        else:
            print(f"Unsupported file type: {file_path}")

############################################
# 7. Start Watchers
############################################
def start_watcher(folder_to_watch):
    event_handler = DataIngestionHandler()
    observer = Observer()
    observer.schedule(event_handler, folder_to_watch, recursive=False)
    observer.start()
    print(f"Started monitoring folder: {folder_to_watch}")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

############################################
# 8. Main Function
############################################
def main():
    # Start watchers for PDF and CSV folders in separate threads (optional)
    pdf_thread = threading.Thread(target=start_watcher, args=(PDF_DIR,), daemon=True)
    csv_thread = threading.Thread(target=start_watcher, args=(CSV_DIR,), daemon=True)

    pdf_thread.start()
    csv_thread.start()

    # Keep main thread alive
    while True:
        time.sleep(1)

if __name__ == "__main__":
    main()
