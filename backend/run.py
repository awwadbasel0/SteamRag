import os
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    dev_reload = os.getenv("DEV_RELOAD", "true").lower() == "true"
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=dev_reload,
        proxy_headers=True,
        forwarded_allow_ips="*",
    )
