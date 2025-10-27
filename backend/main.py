from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl
import uvicorn
from services.repo_clone import clone_github_repo, clean_up_repo, parse_github_url

# Create FastAPI app

app = FastAPI(title="ATTD Backend")



@app.get("/")
async def root():
    return {"message": "Hello from backend!"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/clone")
async def clone_repo(repo_url: str):
    """
    Clone a public GitHub repository and return metadata.
    """
    try:
        github_repo_url = parse_github_url(repo_url)
        result = clone_github_repo(github_repo_url)
        return {
            "message": "Repository cloned successfully",
            "repo_path": result["repo_path"]
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


def main():
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    print("Hello from backend!")


if __name__ == "__main__":
    main()
