from fastapi import FastAPI
import uvicorn

# Create FastAPI app

app = FastAPI(title="ATTD Backend")

# Define routes


@app.get("/")
async def root():
    return {"message": "Hello from backend!"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


def main():
    uvicorn.run(app, host="0.0.0.0", port=8000)
    print("Hello from backend!")


if __name__ == "__main__":
    main()
