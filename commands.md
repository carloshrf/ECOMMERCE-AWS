# iniciar projeto
cdk init --language typescript
# listar stacks
cdk list
# diferenças entre local e remoto
cdk diff
# faz o deploy completo do proj na aws
cdk deploy -all
# destruir todas stacks
cdk destroy --all
# instalar pilhas de bootstrap** instalação de recursos necessários como s3 para o docker
cdk bootstrap