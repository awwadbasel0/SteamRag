from dotenv import load_dotenv
import crossplane
import os
load_dotenv()

VITE_BACKEND_URL = os.getenv("VITE_BACKEND_URL")

payload=crossplane.parse("/etc/nginx/nginx.conf",single=True)

data=payload["config"]
backend_proxy={"directive":"location","args":"/api/","block":[
    {
    "directive":"proxy_pass",
    "args": [VITE_BACKEND_URL]
    }]}

for file in data:
    ast=file["parsed"]
    for conf in ast:
        if conf["directive"] == "http":
            for dir in conf["block"]:
                if conf["directive"] == "server":
                    conf["block"].insert(0, backend_proxy)
        elif conf["directive"] == "server":
            conf["block"].insert(0,backend_proxy)
    new_f=crossplane.build(ast)



with open("/etc/nginx/nginx.conf","w") as nginxf:
    nginxf.write(new_f)

