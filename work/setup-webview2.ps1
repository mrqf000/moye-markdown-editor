$ErrorActionPreference='Stop'
$version='1.0.3595.46'
$package=Join-Path $PSScriptRoot 'webview2.zip'
$destination=Join-Path $PSScriptRoot 'webview2-sdk'
if(Test-Path (Join-Path $destination 'lib\net462\Microsoft.Web.WebView2.Core.dll')){
 Write-Output "WebView2 SDK $version is ready."
 exit 0
}
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$url="https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$version/microsoft.web.webview2.$version.nupkg"
Write-Output "Downloading Microsoft.Web.WebView2 $version from NuGet..."
Invoke-WebRequest -Uri $url -OutFile $package -UseBasicParsing
if(Test-Path $destination){Remove-Item -LiteralPath $destination -Recurse -Force}
Expand-Archive -LiteralPath $package -DestinationPath $destination
Remove-Item -LiteralPath $package -Force
Write-Output "WebView2 SDK $version is ready."

