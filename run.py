# run.py
import uvicorn
import os

if __name__ == "__main__":
    # Get the port from environment variables, default to 8000
    # This allows flexibility, e.g., for production
    port = int(os.environ.get("PORT", 8000))
    
    print(f"Starting server on http://localhost:{port}...")
    
    uvicorn.run(
        "backend.app.main:app",  # Path to your FastAPI 'app' instance
        host="0.0.0.0",          # Listen on all network interfaces
        port=port,               # The port to run on
        reload=True              # Automatically reload on code changes
    )