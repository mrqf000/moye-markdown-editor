using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Diagnostics;
using System.Drawing;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Runtime.InteropServices;
[assembly: System.Runtime.Versioning.TargetFramework(".NETFramework,Version=v4.8")]
[assembly: AssemblyTitle("墨页安装程序")]
[assembly: AssemblyProduct("墨页 Markdown 编辑器")]
[assembly: AssemblyVersion("1.0.0.0")]
internal static class Setup {
 [STAThread] static int Main(string[] args) {
  try {
   if(args.Length==2 && args[0]=="/extract"){Extract(Path.GetFullPath(args[1]));return 0;}
   if(args.Length>0 && args[0]=="--ui")return RunInterface(args);
   if(!Environment.Is64BitOperatingSystem){MessageBox.Show("墨页需要 64 位 Windows 10 或 Windows 11。","墨页安装");return 1;}
   // WinForms must read the DPI configuration before its first UI is created.
   // A configured child domain keeps distribution as one EXE, without a sidecar.
   string temp=Path.Combine(Path.GetTempPath(),"Moye-Setup-Dpi-"+Guid.NewGuid().ToString("N"));
   Directory.CreateDirectory(temp);
   AppDomain domain=null;
   try{
    string config=Path.Combine(temp,"Setup.config");
    using(var resource=Assembly.GetExecutingAssembly().GetManifestResourceStream("Moye.SetupConfig"))
    using(var file=File.Create(config))resource.CopyTo(file);
    var setup=new AppDomainSetup{ApplicationBase=Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location),ConfigurationFile=config,TargetFrameworkName=".NETFramework,Version=v4.8"};
    domain=AppDomain.CreateDomain("Moye.Setup.UI",null,setup);
    var uiArgs=new string[args.Length+1];uiArgs[0]="--ui";Array.Copy(args,0,uiArgs,1,args.Length);
    return domain.ExecuteAssembly(Assembly.GetExecutingAssembly().Location,uiArgs);
   }finally{if(domain!=null)AppDomain.Unload(domain);try{Directory.Delete(temp,true);}catch{}}
  }catch(Exception e){if(Array.IndexOf(args,"/verify-ui")>=0){File.WriteAllText(args[args.Length-1]+".txt",e.ToString());return 1;}MessageBox.Show(e.Message,"墨页安装失败",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}
 }
 static int RunInterface(string[] args){
  Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
  if(args.Length==3 && args[1]=="/verify-ui"){
   using(var form=new SetupWindow()){
    form.TestMode=true;form.ShowInTaskbar=false;form.StartPosition=FormStartPosition.Manual;form.Location=new Point(-32000,-32000);form.Show();Application.DoEvents();
    IntPtr handle=form.Handle;
    if(!AreDpiAwarenessContextsEqual(GetWindowDpiAwarenessContext(handle),new IntPtr(-4)))throw new InvalidOperationException("Installer is not PerMonitorV2 DPI aware.");
    form.PerformAutoScale();
    foreach(Control control in form.Controls){if(control.Right>form.ClientSize.Width || control.Bottom>form.ClientSize.Height)throw new InvalidOperationException("Installer control exceeds client bounds: "+control.Text);}
    using(var bitmap=new Bitmap(form.Width,form.Height)){form.DrawToBitmap(bitmap,new Rectangle(Point.Empty,bitmap.Size));bitmap.Save(args[2],System.Drawing.Imaging.ImageFormat.Png);}
    File.WriteAllText(args[2]+".txt","PerMonitorV2=True; DPI="+GetDpiForWindow(handle)+"; Client="+form.ClientSize+"; Controls="+form.Controls.Count);
   }
   return 0;
  }
  Application.Run(new SetupWindow());return 0;
 }
 [DllImport("user32.dll")] static extern IntPtr GetWindowDpiAwarenessContext(IntPtr window);
 [DllImport("user32.dll")] [return:MarshalAs(UnmanagedType.Bool)] static extern bool AreDpiAwarenessContextsEqual(IntPtr first,IntPtr second);
 [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr window);
 internal static void Extract(string destination) {
  Directory.CreateDirectory(destination);
  string root=Path.GetFullPath(destination).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar;
  using(var payload=Assembly.GetExecutingAssembly().GetManifestResourceStream("Moye.Payload"))
  using(var zip=new ZipArchive(payload,ZipArchiveMode.Read))
   foreach(var entry in zip.Entries){
    string target=Path.GetFullPath(Path.Combine(root,entry.FullName));
    if(!target.StartsWith(root,StringComparison.OrdinalIgnoreCase))throw new IOException("安装包文件路径无效。");
    if(entry.FullName.EndsWith("/")){Directory.CreateDirectory(target);continue;}
    Directory.CreateDirectory(Path.GetDirectoryName(target));
    using(var input=entry.Open())using(var output=new FileStream(target,FileMode.CreateNew,FileAccess.Write))input.CopyTo(output);
   }
 }
}
internal sealed class SetupWindow:Form {
 internal bool TestMode;
 protected override bool ShowWithoutActivation{get{return TestMode;}}
 readonly Button action=new Button();readonly CheckBox launch=new CheckBox();readonly Label status=new Label();readonly ProgressBar progress=new ProgressBar();bool busy,done;
 public SetupWindow(){
  SuspendLayout();AutoScaleDimensions=new SizeF(96F,96F);AutoScaleMode=AutoScaleMode.Dpi;
  Text="安装墨页";ClientSize=new Size(440,285);FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;StartPosition=FormStartPosition.CenterScreen;BackColor=Color.White;Font=new Font("Microsoft YaHei UI",10);
  try{Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);}catch{}
  var logo=new Label{Text="MD",Location=new Point(28,25),Size=new Size(48,44),BackColor=Color.FromArgb(76,126,115),ForeColor=Color.White,TextAlign=ContentAlignment.MiddleCenter,Font=new Font("Segoe UI",12,FontStyle.Bold)};
  var title=new Label{Text="墨页",Location=new Point(90,22),Size=new Size(310,28),Font=new Font("Microsoft YaHei UI",17,FontStyle.Bold)};
  var subtitle=new Label{Text="简洁的 Markdown 可视化编辑器",Location=new Point(92,54),Size=new Size(315,24),ForeColor=Color.FromArgb(113,126,123)};
  status.Location=new Point(28,96);status.Size=new Size(386,60);status.Text="安装到当前用户，无需管理员权限。\n缺少运行组件时将联网安装。";
  progress.Location=new Point(28,162);progress.Size=new Size(384,5);progress.Visible=false;
  launch.Text="安装完成后打开墨页";launch.Checked=true;launch.Location=new Point(28,184);launch.Size=new Size(285,26);
  action.Text="安装";action.Location=new Point(302,225);action.Size=new Size(110,36);action.BackColor=Color.FromArgb(76,126,115);action.ForeColor=Color.White;action.FlatStyle=FlatStyle.Flat;action.FlatAppearance.BorderSize=0;action.Click+=async(s,e)=>await Install();AcceptButton=action;
  Controls.AddRange(new Control[]{logo,title,subtitle,status,progress,launch,action});FormClosing+=(s,e)=>{if(busy)e.Cancel=true;};
  ResumeLayout(false);PerformAutoScale();
 }
 async Task Install(){
  if(done){Close();return;}busy=true;action.Enabled=false;launch.Enabled=false;progress.Visible=true;progress.Style=ProgressBarStyle.Marquee;status.Text="正在准备并安装墨页，请稍候…";
  string temp=Path.Combine(Path.GetTempPath(),"Moye-Setup-"+Guid.NewGuid().ToString("N"));
  try {
   await Task.Run(()=>{
    Setup.Extract(temp);
    var info=new ProcessStartInfo("powershell.exe","-NoProfile -NonInteractive -ExecutionPolicy Bypass -File \""+Path.Combine(temp,"install.ps1")+"\" -NoLaunch"){UseShellExecute=false,CreateNoWindow=true,RedirectStandardOutput=true,RedirectStandardError=true};
    using(var p=Process.Start(info)){var output=p.StandardOutput.ReadToEndAsync();var error=p.StandardError.ReadToEndAsync();p.WaitForExit();Task.WaitAll(output,error);if(p.ExitCode!=0)throw new IOException(error.Result+"\n"+output.Result);}
   });
   status.Text="安装完成。\n桌面和开始菜单已添加“墨页”。";done=true;action.Text="完成";
   if(launch.Checked)Process.Start(new ProcessStartInfo(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Programs","Moye","Moye.exe")){UseShellExecute=true});
  }catch(Exception ex){status.Text="安装未完成，可重试。";MessageBox.Show(this,ex.Message,"墨页安装失败",MessageBoxButtons.OK,MessageBoxIcon.Error);action.Text="重试";launch.Enabled=true;}
  finally{busy=false;action.Enabled=true;progress.Visible=false;try{if(Directory.Exists(temp))Directory.Delete(temp,true);}catch{}}
 }
}
