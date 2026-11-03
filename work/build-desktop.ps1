$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
Set-Location $root
$target=Join-Path $root 'outputs\墨页桌面版'
New-Item -ItemType Directory -Force -Path "$target\app" | Out-Null
if(!(Test-Path 'work\webview2-sdk\lib\net462\Microsoft.Web.WebView2.Core.dll')){& "$PSScriptRoot\setup-webview2.ps1"}
& node work/build.cjs
if($LASTEXITCODE -ne 0){throw 'HTML build failed'}
$html=[IO.File]::ReadAllText('outputs\墨页-Markdown编辑器.html')
$html=$html.Replace('moye-workspace-v2','moye-desktop-workspace-v1').Replace('moye-draft','moye-desktop-draft')
$html=$html.Replace('</body>','<script>'+[IO.File]::ReadAllText('work\desktop.js')+'</script></body>')
$html=$html.Replace('</style>',"`n.topbar[hidden]{display:none!important}header .brand #desktopPath{min-width:0;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;color:var(--muted);font-size:13px;padding:4px 7px}header .actions{flex-wrap:nowrap}.toolbar .end #focus{width:30px;height:30px;padding:6px}.status{position:relative;z-index:200;overflow:visible;isolation:isolate}.status-format{display:flex;align-items:center;gap:8px;white-space:nowrap;position:relative;z-index:201;pointer-events:auto}.status-format>span:last-child{color:color-mix(in srgb,var(--muted) 72%,transparent)}.status .modes{display:flex;align-items:center;gap:1px;padding:1px;border:0;border-radius:6px;background:var(--paper);position:relative;z-index:202;pointer-events:auto}.status .modes button{width:26px;height:26px;padding:4px;display:inline-flex;align-items:center;justify-content:center;border-radius:5px;color:var(--muted);position:relative;z-index:203;pointer-events:auto;touch-action:manipulation}.status .modes button .icon{width:15px;height:15px}.status .modes button.active{color:var(--accent);background:var(--soft)}@media(max-width:900px){header .brand #desktopPath{max-width:150px}}`n</style>")
[IO.File]::WriteAllText("$target\app\index.html",$html,[Text.UTF8Encoding]::new($false))
Copy-Item 'work\webview2-sdk\lib\net462\Microsoft.Web.WebView2.Core.dll','work\webview2-sdk\lib\net462\Microsoft.Web.WebView2.WinForms.dll' -Destination $target -Force
Copy-Item 'work\webview2-sdk\runtimes\win-x64\native\WebView2Loader.dll' -Destination $target -Force
Copy-Item 'work\webview2-sdk\LICENSE.txt' -Destination "$target\WebView2-LICENSE.txt" -Force
Copy-Item 'work\Moye.exe.config' -Destination "$target\Moye.exe.config" -Force
Copy-Item 'work\install.ps1','work\uninstall.ps1','work\shell-new.ps1','work\使用说明.md' -Destination $target -Force
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(!(Test-Path -LiteralPath $compiler)){throw '.NET Framework 4.x C# compiler was not found'}
& $compiler /nologo /target:winexe /platform:x64 /utf8output /win32manifest:"$root\work\moye.manifest" /win32icon:"$root\work\moye.ico" /out:"$target\Moye.exe" /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Web.Extensions.dll /r:System.Net.Http.dll /r:Microsoft.VisualBasic.dll /r:"$target\Microsoft.Web.WebView2.Core.dll" /r:"$target\Microsoft.Web.WebView2.WinForms.dll" "$root\work\Desktop.cs" "$root\work\NativeTitles.cs"
if($LASTEXITCODE -ne 0){throw 'Desktop build failed'}
Write-Output "Built: $target\Moye.exe"
