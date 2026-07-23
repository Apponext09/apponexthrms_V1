import uvicorn
from config import config

if __name__ == "__main__":
    print(f"Starting Apponext HRMS Biometrics Service on {config.HOST}:{config.PORT}...")
    uvicorn.run("main:app", host=config.HOST, port=config.PORT, reload=True)

