using System;
using System.IO;
using System.Text;
using System.Linq;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Drawing;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Web.Script.Serialization;
using Microsoft.VisualBasic.ApplicationServices;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
[assembly: System.Runtime.Versioning.TargetFramework(".NETFramework,Version=v4.8")]

internal static class Program {
 public static string LogFile; public static void Log(string s){if(LogFile!=null)File.AppendAllText(LogFile,s+Environment.NewLine);}
 [STAThread] static void Main(string[] args) {
  LogFile=args.FirstOrDefault(x=>x.StartsWith("--log="));if(LogFile!=null)LogFile=LogFile.Substring(6);Log("Main");
  Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
  try { new SingleApp(args).Run(args); } catch(Exception ex) { Log(ex.ToString());MessageBox.Show("墨页未能启动：\n"+ex.Message,"墨页",MessageBoxButtons.OK,MessageBoxIcon.Error); }
 }
}
internal sealed class SingleApp : WindowsFormsApplicationBase {
 readonly string[] first;
 public SingleApp(string[] args){first=args;IsSingleInstance=true;EnableVisualStyles=true;ShutdownStyle=ShutdownMode.AfterMainFormCloses;}
 protected override void OnCreateMainForm(){Program.Log("Creating window");MainForm=new EditorWindow(first);Program.Log("Window created");}
 protected override void OnStartupNextInstance(StartupNextInstanceEventArgs e){base.OnStartupNextInstance(e);((EditorWindow)MainForm).QueueFiles(e.CommandLine.ToArray());e.BringToForeground=true;}
}
internal sealed class DiskDocument {
 public string Id,Path,Hash,Newline; public Encoding Encoding;
}
internal sealed class EditorWindow : Form {
 readonly WebView2 view=new WebView2(); readonly JavaScriptSerializer json=new JavaScriptSerializer{MaxJsonLength=32*1024*1024};
 readonly Dictionary<string,DiskDocument> files=new Dictionary<string,DiskDocument>(); readonly List<string> queued=new List<string>();
 string testProfile; bool ready,allowClose,closing; readonly string home=AppDomain.CurrentDomain.BaseDirectory;
 public EditorWindow(string[] args){testProfile=args.FirstOrDefault(x=>x.StartsWith("--profile="));Text="墨页";AutoScaleDimensions=new SizeF(96F,96F);AutoScaleMode=AutoScaleMode.Dpi;Size=new Size(1250,860);MinimumSize=new Size(780,580);StartPosition=FormStartPosition.CenterScreen;BackColor=Color.FromArgb(247,249,249);try{Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);}catch{}view.Dock=DockStyle.Fill;Controls.Add(view);queued.AddRange(args.Where(x=>!x.StartsWith("--")));Shown+=async(s,e)=>await Start();FormClosing+=ClosingWindow;}
 async Task Start(){try{string profile=testProfile==null?System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Moye","WebView2"):testProfile.Substring(10);var env=await CoreWebView2Environment.CreateAsync(null,profile);await view.EnsureCoreWebView2Async(env);var core=view.CoreWebView2;core.Settings.AreDevToolsEnabled=false;core.Settings.IsStatusBarEnabled=false;core.Settings.AreDefaultContextMenusEnabled=false;core.SetVirtualHostNameToFolderMapping("moye.local",System.IO.Path.Combine(home,"app"),CoreWebView2HostResourceAccessKind.DenyCors);
  core.NavigationStarting+=(s,e)=>{Uri uri;if(!Uri.TryCreate(e.Uri,UriKind.Absolute,out uri))return;if(uri.Scheme=="https"&&uri.Host=="moye.local")return;e.Cancel=true;External(e.Uri);};
  core.NewWindowRequested+=(s,e)=>{e.Handled=true;External(e.Uri);};core.PermissionRequested+=(s,e)=>e.State=CoreWebView2PermissionState.Deny;
  core.WebMessageReceived+=Message;core.ProcessFailed+=(s,e)=>MessageBox.Show(this,"编辑窗口异常。请重新打开墨页，自动恢复的草稿会保留。","墨页");
  core.Navigate("https://moye.local/index.html");
 }catch(Exception ex){MessageBox.Show(this,"无法启动编辑界面：\n"+ex.Message+"\n\n请安装 Microsoft Edge WebView2 Runtime 后重试。","墨页",MessageBoxButtons.OK,MessageBoxIcon.Error);allowClose=true;Close();}}
 void External(string url){Uri u;if(Uri.TryCreate(url,UriKind.Absolute,out u)&&(u.Scheme=="https"||u.Scheme=="http"||u.Scheme=="mailto")){try{Process.Start(new ProcessStartInfo(url){UseShellExecute=true});}catch{}}}
 public void QueueFiles(string[] paths){queued.AddRange(paths.Where(x=>!x.StartsWith("--")));if(ready)DrainFiles();if(WindowState==FormWindowState.Minimized)WindowState=FormWindowState.Normal;Activate();}
 void DrainFiles(){var paths=queued.ToArray();queued.Clear();foreach(var p in paths)try{OpenFile(p);}catch(Exception ex){MessageBox.Show(this,"无法打开文件：\n"+p+"\n\n"+ex.Message,"墨页",MessageBoxButtons.OK,MessageBoxIcon.Warning);}}
 string S(Dictionary<string,object> d,string key){object v;return d.TryGetValue(key,out v)&&v!=null?Convert.ToString(v):"";}
 void Post(object value){if(view.CoreWebView2!=null)view.CoreWebView2.PostWebMessageAsJson(json.Serialize(value));}
 async void Message(object sender,CoreWebView2WebMessageReceivedEventArgs e){if(e.Source!="https://moye.local/index.html")return;Dictionary<string,object> m;try{m=json.Deserialize<Dictionary<string,object>>(e.WebMessageAsJson);}catch{return;}object req; m.TryGetValue("request",out req);
  try {object result=new{};switch(S(m,"action")){
   case "ready":ready=true;DrainFiles();break;
   case "windowTitle":Text=S(m,"title");break;
   case "open":using(var dialog=new OpenFileDialog{Filter="Markdown 文件 (*.md;*.markdown)|*.md;*.markdown|文本文件 (*.txt)|*.txt",Multiselect=true,Title="打开 Markdown 文件"}){if(dialog.ShowDialog(this)==DialogResult.OK)QueueFiles(dialog.FileNames);}break;
   case "restore":result=ReadDocument(S(m,"path"),S(m,"id"),S(m,"hash"));break;
   case "save":case "saveAs":result=SaveDocument(m,S(m,"action")=="saveAs");break;
   case "close":var answer=MessageBox.Show(this,"是否保存对“"+S(m,"name")+"”的修改？\n选择“否”将放弃本次未保存的修改。","墨页",MessageBoxButtons.YesNoCancel,MessageBoxIcon.Question);if(answer==DialogResult.Cancel)result=new{cancelled=true};else if(answer==DialogResult.Yes){var saved=SaveDocument(m,false);if(IsCancelled(saved))result=new{cancelled=true};else result=new{saved=saved};}break;
   case "reveal":DiskDocument doc;if(files.TryGetValue(S(m,"id"),out doc))Process.Start("explorer.exe","/select,\""+doc.Path+"\"");break;
   case "defaults":Process.Start(new ProcessStartInfo("ms-settings:defaultapps?registeredAppUser=Moye"){UseShellExecute=true});break;
   case "title":result=new{title=await NativeTitles.GetTitle(S(m,"url"))};break;
   default:throw new InvalidOperationException("无法识别的操作");
  }Post(new{request=req,result=result});}catch(Exception ex){Post(new{request=req,error=ex.Message});}
 }
 static bool IsCancelled(object result){return result.GetType().GetProperty("cancelled")!=null;}
 internal static string Hash(byte[] bytes){using(var sha=SHA256.Create())return Convert.ToBase64String(sha.ComputeHash(bytes));}
 object ReadDocument(string path,string id,string expected){path=System.IO.Path.GetFullPath(path);if(new FileInfo(path).Length>5*1024*1024)throw new IOException("文件超过 5 MB，请使用适合大文件的编辑器。");var bytes=File.ReadAllBytes(path);Encoding enc;string text;
  if(bytes.Length>=3&&bytes[0]==239&&bytes[1]==187&&bytes[2]==191){enc=new UTF8Encoding(true,true);text=enc.GetString(bytes,3,bytes.Length-3);}else if(bytes.Length>=2&&bytes[0]==255&&bytes[1]==254){enc=Encoding.Unicode;text=enc.GetString(bytes,2,bytes.Length-2);}else if(bytes.Length>=2&&bytes[0]==254&&bytes[1]==255){enc=Encoding.BigEndianUnicode;text=enc.GetString(bytes,2,bytes.Length-2);}else{try{enc=new UTF8Encoding(false,true);text=enc.GetString(bytes);}catch(DecoderFallbackException){enc=Encoding.GetEncoding(54936,EncoderFallback.ExceptionFallback,DecoderFallback.ExceptionFallback);text=enc.GetString(bytes);}}
  if(text.IndexOf('\0')>=0)throw new IOException("该文件不是可编辑的 Markdown 文本。");var hash=Hash(bytes);files[id]=new DiskDocument{Id=id,Path=path,Hash=String.IsNullOrEmpty(expected)?hash:expected,Newline=text.Contains("\r\n")?"\r\n":"\n",Encoding=enc};return new{id=id,path=path,name=System.IO.Path.GetFileName(path),text=text,hash=hash};
 }
 void OpenFile(string path){path=System.IO.Path.GetFullPath(path);var existing=files.Values.FirstOrDefault(x=>String.Equals(x.Path,path,StringComparison.OrdinalIgnoreCase));if(existing!=null){Post(new{ @event="opened",file=ReadDocument(path,existing.Id,existing.Hash)});return;}var file=ReadDocument(path,Guid.NewGuid().ToString(),null);Post(new{@event="opened",file=file});}
 object SaveDocument(Dictionary<string,object> m,bool saveAs){string id=S(m,"id"),text=S(m,"text");DiskDocument doc;files.TryGetValue(id,out doc);string path=doc==null?null:doc.Path;bool changedTarget=saveAs||doc==null;
  if(!changedTarget&&(!File.Exists(path)||Hash(File.ReadAllBytes(path))!=doc.Hash)){var choice=MessageBox.Show(this,"磁盘上的文件已被其他程序修改或移动。\n\n是：覆盖磁盘文件\n否：另存为其他文件\n取消：返回编辑器","检测到文件变化",MessageBoxButtons.YesNoCancel,MessageBoxIcon.Warning);if(choice==DialogResult.Cancel)return new{cancelled=true};changedTarget=choice==DialogResult.No;}
  if(changedTarget){using(var dialog=new SaveFileDialog{Title="保存 Markdown 文件",Filter="Markdown 文件 (*.md)|*.md",DefaultExt="md",AddExtension=true,OverwritePrompt=true,FileName=System.IO.Path.GetFileName(doc==null?S(m,"name"):doc.Path)}){if(doc!=null)dialog.InitialDirectory=System.IO.Path.GetDirectoryName(doc.Path);if(dialog.ShowDialog(this)!=DialogResult.OK)return new{cancelled=true};path=dialog.FileName;}if(files.Values.Any(x=>x.Id!=id&&String.Equals(x.Path,path,StringComparison.OrdinalIgnoreCase)))throw new IOException("该文件已在另一个标签页中打开，请切换到对应标签页保存。");}
  var encoding=doc==null||changedTarget?new UTF8Encoding(false,true):doc.Encoding;var newline=doc==null?"\r\n":doc.Newline;var diskText=text.Replace("\r\n","\n").Replace("\r","\n").Replace("\n",newline);var payload=encoding.GetPreamble().Concat(encoding.GetBytes(diskText)).ToArray();AtomicWrite(path,payload);var hash=Hash(payload);files[id]=new DiskDocument{Id=id,Path=path,Hash=hash,Newline=newline,Encoding=encoding};return new{id=id,path=path,name=System.IO.Path.GetFileName(path),text=text,hash=hash};
 }
 internal static void AtomicWrite(string path,byte[] bytes){string temp=path+".moye-"+Guid.NewGuid().ToString("N")+".tmp";try{using(var stream=new FileStream(temp,FileMode.CreateNew,FileAccess.Write,FileShare.None)){stream.Write(bytes,0,bytes.Length);stream.Flush(true);}if(File.Exists(path))File.Replace(temp,path,null);else File.Move(temp,path);}finally{if(File.Exists(temp))File.Delete(temp);}}
 async void ClosingWindow(object sender,FormClosingEventArgs e){if(allowClose||!ready)return;e.Cancel=true;if(closing)return;closing=true;try{var serialized=await view.CoreWebView2.ExecuteScriptAsync("window.moyeDesktopPrepareClose()");var docs=json.Deserialize<List<Dictionary<string,object>>>(serialized);foreach(var d in docs){object dirty;if(!d.TryGetValue("dirty",out dirty)||!Convert.ToBoolean(dirty))continue;var answer=MessageBox.Show(this,"是否保存对“"+S(d,"name")+"”的修改？","退出墨页",MessageBoxButtons.YesNoCancel,MessageBoxIcon.Question);if(answer==DialogResult.Cancel)return;if(answer==DialogResult.Yes){var saved=SaveDocument(d,false);if(IsCancelled(saved))return;Post(new{@event="saved",file=saved});}else{await view.CoreWebView2.ExecuteScriptAsync("window.moyeDesktopDiscard("+json.Serialize(S(d,"id"))+")");}}allowClose=true;Close();}catch(Exception ex){MessageBox.Show(this,"退出前处理文档失败：\n"+ex.Message,"墨页");}finally{closing=false;}}
}
