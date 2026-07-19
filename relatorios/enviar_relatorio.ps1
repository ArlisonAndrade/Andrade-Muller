# Envia o relatório trimestral por e-mail via SMTP do Gmail (senha de app).
# Uso:
#   .\enviar_relatorio.ps1                          # envia o relatório mais recente da pasta
#   .\enviar_relatorio.ps1 -Arquivo <caminho.html>  # envia um relatório específico
#   .\enviar_relatorio.ps1 -Para outro@email.com    # muda o destinatário
param(
    [string]$Arquivo,
    [string]$Para = "gmgestaoestrategia@gmail.com"
)

$ErrorActionPreference = "Stop"
$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path

# Credenciais em relatorios/.env.envio (fora do git) — ver .env.envio.example
$envFile = Join-Path $pasta ".env.envio"
if (-not (Test-Path $envFile)) {
    throw "Credenciais nao encontradas: $envFile. Copie o .env.envio.example para .env.envio e preencha."
}
$config = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') { $config[$matches[1].Trim()] = $matches[2].Trim() }
}
foreach ($chave in @('GMAIL_USUARIO', 'GMAIL_SENHA_APP')) {
    if (-not $config[$chave]) { throw "Variavel $chave ausente em .env.envio" }
}

if (-not $Arquivo) {
    $ultimo = Get-ChildItem (Join-Path $pasta "relatorio_trimestral_*.html") |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $ultimo) { throw "Nenhum relatorio_trimestral_*.html encontrado em $pasta" }
    $Arquivo = $ultimo.FullName
}
if (-not (Test-Path $Arquivo)) { throw "Relatorio nao encontrado: $Arquivo" }

$nome = [System.IO.Path]::GetFileNameWithoutExtension($Arquivo)
$trimestre = ""
if ($nome -match '(\dT\d\d)') { $trimestre = $matches[1].ToUpper() }
$assunto = ("Relatorio Gerencial Trimestral $trimestre - FM Gestao e Estrategia" -replace '\s+', ' ').Trim()

$html = Get-Content $Arquivo -Raw -Encoding UTF8

# Senha de app do Google: 16 caracteres, espacos sao removidos automaticamente
$senhaTexto = $config['GMAIL_SENHA_APP'] -replace '\s', ''
$senha = ConvertTo-SecureString $senhaTexto -AsPlainText -Force
$credencial = New-Object System.Management.Automation.PSCredential($config['GMAIL_USUARIO'], $senha)

Send-MailMessage `
    -From $config['GMAIL_USUARIO'] `
    -To $Para `
    -Subject $assunto `
    -Body $html -BodyAsHtml `
    -Attachments $Arquivo `
    -SmtpServer "smtp.gmail.com" -Port 587 -UseSsl `
    -Credential $credencial `
    -Encoding ([System.Text.Encoding]::UTF8)

Write-Host "E-mail enviado para $Para — assunto: $assunto — anexo: $(Split-Path -Leaf $Arquivo)"
