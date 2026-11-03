param([string]$InstallerName='墨页安装包.exe',[switch]$ReuseDesktopHost)
$ErrorActionPreference='Stop'
if([IO.Path]::GetFileName($InstallerName) -ne $InstallerName){throw 'InstallerName must be a file name'}
$root=Split-Path $PSScriptRoot -Parent
Set-Location $root
try{& "$PSScriptRoot\build-desktop.ps1"}catch{if(!$ReuseDesktopHost){throw};Write-Output 'Desktop host is running; reused the existing native host after updating app/index.html.'}
if($LASTEXITCODE -ne 0 -and !$ReuseDesktopHost){throw 'Desktop build failed'}
Add-Type -AssemblyName System.IO.Compression
$bundle=Join-Path $root 'work\moye-install-payload.zip'
$files=@('Moye.exe','Moye.exe.config','Microsoft.Web.WebView2.Core.dll','Microsoft.Web.WebView2.WinForms.dll','WebView2Loader.dll','WebView2-LICENSE.txt','使用说明.md','install.ps1','uninstall.ps1','shell-new.ps1','app/index.html')
$source=Join-Path $root 'outputs\墨页桌面版'
foreach($script in @('install.ps1','uninstall.ps1','shell-new.ps1')){
 $scriptPath=Join-Path $source $script
 [IO.File]::WriteAllText($scriptPath,[IO.File]::ReadAllText($scriptPath),[Text.UTF8Encoding]::new($true))
}
$stream=[IO.File]::Create($bundle)
$zip=[IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Create)
try {
 foreach($file in $files){
  $entry=$zip.CreateEntry($file,[IO.Compression.CompressionLevel]::Optimal)
  $entryStream=$entry.Open();$inputStream=[IO.File]::OpenRead((Join-Path $source $file))
  try{$inputStream.CopyTo($entryStream)}finally{$inputStream.Dispose();$entryStream.Dispose()}
 }
}finally{$zip.Dispose();$stream.Dispose()}
$setup=Join-Path (Join-Path $root 'outputs') $InstallerName
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(!(Test-Path -LiteralPath $compiler)){throw '.NET Framework 4.x C# compiler was not found'}
& $compiler /nologo /target:winexe /platform:anycpu /utf8output /win32manifest:"$PSScriptRoot\moye.manifest" /win32icon:"$PSScriptRoot\moye.ico" /out:"$setup" /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.IO.Compression.dll "/resource:$bundle,Moye.Payload" "/resource:$PSScriptRoot\Moye.exe.config,Moye.SetupConfig" "$PSScriptRoot\Setup.cs"
if($LASTEXITCODE -ne 0){throw 'Installer build failed'}
Write-Output "Built installer: $setup"
$enableScript=[IO.File]::ReadAllText((Join-Path $source 'shell-new.ps1'))+@'

$ErrorActionPreference='Stop'
try{
 Register-MoyeShellNew -Exe (Join-Path $env:LOCALAPPDATA 'Programs\Moye\Moye.exe')
 Update-MoyeShellAssociations
 Write-Output '已添加：文件夹空白处右键 → 新建 → Markdown 文档。'
}catch{Write-Host $_.Exception.Message;exit 1}
'@
$buffer=[IO.MemoryStream]::new()
$gzip=[IO.Compression.GZipStream]::new($buffer,[IO.Compression.CompressionMode]::Compress,$true)
$scriptBytes=[Text.Encoding]::UTF8.GetBytes($enableScript)
$gzip.Write($scriptBytes,0,$scriptBytes.Length);$gzip.Dispose()
$compressed=[Convert]::ToBase64String($buffer.ToArray());$buffer.Dispose()
$launcher="`$bytes=[Convert]::FromBase64String('$compressed');`$stream=[IO.MemoryStream]::new(`$bytes);`$gzip=[IO.Compression.GZipStream]::new(`$stream,[IO.Compression.CompressionMode]::Decompress);`$reader=[IO.StreamReader]::new(`$gzip);& ([scriptblock]::Create(`$reader.ReadToEnd()))"
$encoded=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($launcher))
if($encoded.Length -gt 7800){throw 'Context menu helper exceeds Windows command length'}
$command="@echo off`r`npowershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand $encoded`r`npause`r`n"
[IO.File]::WriteAllText((Join-Path $root 'outputs\启用右键新建MD.cmd'),$command,[Text.Encoding]::ASCII)
