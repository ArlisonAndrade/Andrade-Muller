# Envia as NFS-e do mês pra IBVET, do jeito que a Franciele manda desde dez/2025:
# um e-mail só, pra rh.notafiscal@ibvet.com.br (Marta), assunto "NF - Referente
# a <Mês>", texto fixo e os PDFs ORIGINAIS da pasta do mês em anexo (IBVET + IEA).
#
# O PDF anexado é o arquivo do disco, byte a byte — nada é gerado nem convertido.
# Antes de enviar, o script mostra o SHA-256 de cada PDF; com -Hashes, só envia
# se cada arquivo bater com o hash informado.
#
# Uso:
#   .\enviar_nfs.ps1 -Mes "Setembro 26" -Teste            # manda só pro Arlison conferir
#   .\enviar_nfs.ps1 -Mes "Setembro 26"                   # manda pra Marta (rh.notafiscal@ibvet.com.br)
#   .\enviar_nfs.ps1 -Mes "Setembro 26" -Para outro@x.com # outro destinatário
#
# Credenciais: relatorios/.env.envio (fora do git) com GMAIL_USUARIO e GMAIL_SENHA_APP
# da conta gmgestaoestrategica@gmail.com (senha de app do Google, 16 letras).
param(
    [Parameter(Mandatory = $true)][string]$Mes,
    [string]$Para = "rh.notafiscal@ibvet.com.br",
    [switch]$Teste,
    [string[]]$Hashes,
    [switch]$Diagnostico # só testa o login no Gmail (não envia nada, não mostra a senha)
)

$ErrorActionPreference = "Stop"
$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path
$raiz = Split-Path -Parent $pasta

if ($Teste) { $Para = "arlisonandrade88@gmail.com" }

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

if ($Diagnostico) {
    $usuario = $config['GMAIL_USUARIO']
    $senhaApp = $config['GMAIL_SENHA_APP'] -replace '\s', ''
    Write-Host "Usuario: $usuario | senha: $($senhaApp.Length) caracteres"
    $c = New-Object Net.Sockets.TcpClient("smtp.gmail.com", 587); $s = $c.GetStream(); $s.ReadTimeout = 10000
    $r = New-Object IO.StreamReader($s); $w = New-Object IO.StreamWriter($s); $w.AutoFlush = $true; $w.NewLine = "`r`n"
    [void]$r.ReadLine(); $w.WriteLine("EHLO portal"); do { $l = $r.ReadLine() } while ($l -match '^250-')
    $w.WriteLine("STARTTLS"); [void]$r.ReadLine()
    $ssl = New-Object Net.Security.SslStream($s, $false)
    $ssl.AuthenticateAsClient("smtp.gmail.com", $null, [Security.Authentication.SslProtocols]::Tls12, $false)
    $r = New-Object IO.StreamReader($ssl); $w = New-Object IO.StreamWriter($ssl); $w.AutoFlush = $true; $w.NewLine = "`r`n"
    $w.WriteLine("EHLO portal"); do { $l = $r.ReadLine() } while ($l -match '^250-')
    $b64 = { param($t) [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($t)) }
    $w.WriteLine("AUTH PLAIN " + (& $b64 ("`0" + $usuario + "`0" + $senhaApp)))
    Write-Host ("Resposta do Gmail ao login: " + $r.ReadLine())
    $w.WriteLine("QUIT"); $c.Close()
    return
}

# Pasta do mês: "NFS-e Emitidas e Extrato/<ano>/<Mês AA>"
$ano = "20" + ($Mes -split ' ')[-1]
$pastaMes = Join-Path $raiz "NFS-e Emitidas e Extrato\$ano\$Mes"
if (-not (Test-Path $pastaMes)) { throw "Pasta do mes nao encontrada: $pastaMes" }
$pdfs = Get-ChildItem -Path $pastaMes -Filter *.pdf | Sort-Object Name
if ($pdfs.Count -eq 0) { throw "Nenhum PDF em $pastaMes" }

Write-Host "Anexos (arquivo original, sem alteracao):"
$i = 0
foreach ($pdf in $pdfs) {
    $hash = (Get-FileHash $pdf.FullName -Algorithm SHA256).Hash.ToLower()
    Write-Host ("  {0}  {1,7} bytes  sha256 {2}" -f $pdf.Name, $pdf.Length, $hash.Substring(0, 16))
    if ($Hashes) {
        if ($i -ge $Hashes.Count -or -not $hash.StartsWith($Hashes[$i].ToLower())) {
            throw "PDF diferente do conferido: $($pdf.Name). Nada foi enviado."
        }
    }
    $i++
}

$nomeMes = ($Mes -split ' ')[0]
$assunto = "NF - Referente a $nomeMes"
$saudacao = if ((Get-Date).Hour -lt 12) { "Bom dia" } else { "Boa tarde" }
$html = @"
<div dir="ltr">$saudacao Marta,<div><br></div><div>Seguem em anexo as notas fiscais.</div><div><br></div><div><br></div><div>Atenciosamente,</div><div><strong>Franciele Muller Guimarães</strong><br>Consultora em Estratégia Institucional e Inteligência Comercial.</div></div>
"@

# O PowerShell 5.1 negocia TLS antigo e o Gmail fecha a conexão
# ("net_io_connectionclosed") — força TLS 1.2.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$senhaTexto = $config['GMAIL_SENHA_APP'] -replace '\s', ''

# System.Net.Mail direto (e não Send-MailMessage): deixa marcar o anexo como
# application/pdf, igual ao que a Franciele manda, e o texto como UTF-8.
$msg = New-Object Net.Mail.MailMessage
$msg.From = New-Object Net.Mail.MailAddress($config['GMAIL_USUARIO'], "Franciele Muller", [Text.Encoding]::UTF8)
$msg.To.Add($Para)
$msg.Subject = $assunto
$msg.SubjectEncoding = [Text.Encoding]::UTF8
$msg.Body = $html
$msg.IsBodyHtml = $true
$msg.BodyEncoding = [Text.Encoding]::UTF8
foreach ($pdf in $pdfs) {
    # O anexo lê o arquivo do disco como está — nome original, conteúdo intacto.
    $anexo = New-Object Net.Mail.Attachment($pdf.FullName, "application/pdf")
    $anexo.Name = $pdf.Name
    $msg.Attachments.Add($anexo)
}
$smtp = New-Object Net.Mail.SmtpClient("smtp.gmail.com", 587)
$smtp.EnableSsl = $true
$smtp.Credentials = New-Object Net.NetworkCredential($config['GMAIL_USUARIO'], $senhaTexto)
try { $smtp.Send($msg) } finally { $msg.Dispose(); $smtp.Dispose() }

Write-Host "E-mail enviado para $Para - assunto: $assunto - $($pdfs.Count) PDF(s)."
