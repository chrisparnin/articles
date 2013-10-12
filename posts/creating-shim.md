---
title: Creating a Visual Studio extension shim for automark
date: '2013-10-12'
description:
layout: "posts-narrative"
categories:
---

`automark` is a tool for generating a markdown summary of a coding task from recent coding history.  It designed work with another tool, [autogit](https://github.com/chrisparnin/autogit), which records fine-grain code changes in the IDE.

Something a little different about this blog post is that this doesn't aim to be a perfect *how-to* document, but instead, show incremental progress and mistakes along the way.

## Coding Summary, Friday, October 11, 2013

I will be showing one example usage of automark, by showing you a blog post generated from a recent coding task.  The *goal* of the task was to create a light-weight shim for Visual Studio to run and launch automark, which currently works as a command line tool, from the IDE itself.

### Setting up VSX package

`ProvideAutoLoad` is necessary for getting Visual Studio package to load automatically.

#### automark.VisualStudio/automark.VisualStudioPackage.cs

         // This attribute registers a tool window exposed by this package.
         [ProvideToolWindow(typeof(MyToolWindow))]
         [Guid(GuidList.guidautomarkVisualStudioPkgString)]
    +    [ProvideAutoLoad(VSConstants.UICONTEXT.SolutionExists_string)]
         public sealed class automarkVisualStudioPackage : Package
         {
             /// <summary>


Code for showing a message box is automatically generated -- extract this out as a method, can use later for debugging and error reporting.

#### automark.VisualStudio/automark.VisualStudioPackage.cs

             /// </summary>
             private void MenuItemCallback(object sender, EventArgs e)
             {
             }
    +        private void ShowMessage(string title, string message)
    +        {
                 // Show a Message Box to prove we were here
                 IVsUIShell uiShell = (IVsUIShell)GetService(typeof(SVsUIShell));
                 Guid clsid = Guid.Empty;
                 Microsoft.VisualStudio.ErrorHandler.ThrowOnFailure(uiShell.ShowMessageBox(
                            0,
                            ref clsid,
    -                       "automark",
    -                       string.Format(CultureInfo.CurrentCulture, "Inside {0}.MenuItemCallback()", this.ToString()),
    +                       title,
    +                       message,
                            string.Empty,

### Executing command line program and reading its output


* [c# - Run Command Prompt Commands - Stack Overflow](http://stackoverflow.com/questions/1469764/run-command-prompt-commands)

Get template code for running an executable for  command prompt.

#### automark.VisualStudio/automark.VisualStudioPackage.cs

             /// </summary>
             private void MenuItemCallback(object sender, EventArgs e)
             {
    -
    +            System.Diagnostics.Process process = new System.Diagnostics.Process();
    +            System.Diagnostics.ProcessStartInfo startInfo = new System.Diagnostics.ProcessStartInfo();
    +            startInfo.WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden;
    +            startInfo.FileName = "automark.exe";
    +            startInfo.Arguments = "C:/DEV/github/automark/Source/Extensions/automark.VisualStudio/.HistoryData/LocalHistory";
    +            process.StartInfo = startInfo;
    +            process.Start();
             }
    

* [getting-the-path-of-the-current-assembly](http://stackoverflow.com/questions/864484/getting-the-path-of-the-current-assembly)

Thought relative path for running `automark.exe`, would work, but need to give it full path.

#### automark.VisualStudio/automark.VisualStudioPackage.cs

    +using System.Reflection;
    
     namespace ninlabs.automark.VisualStudio
     {
             /// </summary>
             private void MenuItemCallback(object sender, EventArgs e)
             {
    +            string path = (new System.Uri(Assembly.GetExecutingAssembly().CodeBase)).AbsolutePath;
    +            string directory = System.IO.Path.GetDirectoryName(path);
    +            string executable = System.IO.Path.Combine(directory, "automark.exe");
                 System.Diagnostics.Process process = new System.Diagnostics.Process();
                 System.Diagnostics.ProcessStartInfo startInfo = new System.Diagnostics.ProcessStartInfo();
                 startInfo.WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden;
    -            startInfo.FileName = "automark.exe";
    +            startInfo.FileName = executable;
                 startInfo.Arguments = "C:/DEV/github/automark/Source/Extensions/automark.VisualStudio/.HistoryData/LocalHistory";
                 process.StartInfo = startInfo;

* [http://stackoverflow.com/questions/4291912/process-start-how-to-get-the-output](http://stackoverflow.com/questions/4291912/process-start-how-to-get-the-output)

Let's get the process output.

#### automark.VisualStudio/automark.VisualStudioPackage.cs

                 System.Diagnostics.Process process = new System.Diagnostics.Process();
                 System.Diagnostics.ProcessStartInfo startInfo = new System.Diagnostics.ProcessStartInfo();
                 startInfo.WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden;
    +            startInfo.RedirectStandardOutput = true;
                 startInfo.FileName = executable;
                 startInfo.Arguments = "C:/DEV/github/automark/Source/Extensions/automark.VisualStudio/.HistoryData/LocalHistory";
                 process.StartInfo = startInfo;
                 process.Start();
    +            while (!process.StandardOutput.EndOfStream)
    +            {
    +                string line = process.StandardOutput.ReadLine();
    +            }
             }

Get the error output too for prosperity sake.

#### automark.VisualStudio/automark.VisualStudioPackage.cs

    +            startInfo.RedirectStandardError = true;
                 startInfo.FileName = executable;
                 startInfo.Arguments = "C:/DEV/github/automark/Source/Extensions/automark.VisualStudio/.HistoryData/LocalHistory";
                 process.StartInfo = startInfo;
                 {
                     string line = process.StandardOutput.ReadLine();
                 }
    +            while (!process.StandardError.EndOfStream)
    +            {
    +                string line = process.StandardError.ReadLine();
    +            }
             }

### Getting current solution

I've been hard coding a test value to the command line tool.
Need to get the solution path, so I can locate it's local history provided by [autogit](https://github.com/chrisparnin/autogit).  You can get this by listening to solution events.

But, I accidentally implemented `IVsSolution`, not `IVsSolutionEvents`, which let's you listen to solution open events, etc.

#### automark.VisualStudio/automark.VisualStudioPackage.cs

         [ProvideToolWindow(typeof(MyToolWindow))]
         [Guid(GuidList.guidautomarkVisualStudioPkgString)]
         [ProvideAutoLoad(VSConstants.UICONTEXT.SolutionExists_string)]
    -    public sealed class automarkVisualStudioPackage : Package, IVsSolution
    +    public sealed class automarkVisualStudioPackage : Package, IVsSolutionEvents
    +
         {
             /// <summary>
             }

    -        public int AddVirtualProject(IVsHierarchy pHierarchy, uint grfAddVPFlags)
    -        {
    -            return VSConstants.S_OK;
    -        }


To implement `IVsSolutionEvents`, you need to return `VSConstants.S_OK` if everything goes ok.

#### automark.VisualStudio/automark.VisualStudioPackage.cs

             public int OnAfterLoadProject(IVsHierarchy pStubHierarchy, IVsHierarchy pRealHierarchy)
             {
    -            throw new NotImplementedException();
    +            return VSConstants.S_OK;
             }
    
             public int OnAfterOpenProject(IVsHierarchy pHierarchy, int fAdded)
             {
    -            throw new NotImplementedException();
    +            return VSConstants.S_OK;
             }


Add solution cookie and subscribe to solution events.

#### automark.VisualStudio/automark.VisualStudioPackage.cs

         [Guid(GuidList.guidautomarkVisualStudioPkgString)]
         [ProvideAutoLoad(VSConstants.UICONTEXT.SolutionExists_string)]
         public sealed class automarkVisualStudioPackage : Package, IVsSolutionEvents
    -
         {
    +        private uint m_solutionCookie = 0;
    +
             /// <summary>
             /// Default constructor of the package.
                     MenuCommand menuToolWin = new MenuCommand(ShowToolWindow, toolwndCommandID);
                     mcs.AddCommand( menuToolWin );
                 }
    +            IVsSolution solution = (IVsSolution)GetService(typeof(SVsSolution));
    +            ErrorHandler.ThrowOnFailure(solution.AdviseSolutionEvents(this, out m_solutionCookie));


Copied some code to handle solution path.

#### automark.VisualStudio/automark.VisualStudioPackage.cs

         public sealed class automarkVisualStudioPackage : Package, IVsSolutionEvents
         {
             private uint m_solutionCookie = 0;
    +        EnvDTE.DTE m_dte;
    
             /// <summary>
             /// Default constructor of the package.
    
             public int OnAfterOpenSolution(object pUnkReserved, int fNewSolution)
             {
    +            InitializeWithDTEAndSolutionReady();
                 return VSConstants.S_OK;
             }
    
    +        private void InitializeWithDTEAndSolutionReady()
    +        {
    +            m_dte = (EnvDTE.DTE)this.GetService(typeof(EnvDTE.DTE));
    +            if (m_dte == null)
    +                ErrorHandler.ThrowOnFailure(1);
    +            var solutionBase = "";
    +            var solutionName = "";
    +            if (m_dte.Solution != null)
    +            {
    +                solutionBase = System.IO.Path.GetDirectoryName(m_dte.Solution.FullName);
    +                solutionName = System.IO.Path.GetFileNameWithoutExtension(m_dte.Solution.FullName);
    +            }
    +            //string dbName = string.Format("Ganji.History-{0}.sdf", solutionName);
    +            var basePath = PreparePath();
    +            var repositoryPath = System.IO.Path.Combine(basePath, "LocalHistory");
    +            var solutionPath = solutionBase;
    +            m_saveListener = new SaveListener();
    +            m_saveListener.Register(m_dte, repositoryPath, solutionPath);
    +        }


Tweak to only keep part for finding out local history path.

#### automark.VisualStudio/automark.VisualStudioPackage.cs

         public sealed class automarkVisualStudioPackage : Package, IVsSolutionEvents
         {
             private uint m_solutionCookie = 0;
    -        EnvDTE.DTE m_dte;
    +        private EnvDTE.DTE m_dte;
    +        private string m_localHistoryPath = "";
    
             /// <summary>
                     solutionBase = System.IO.Path.GetDirectoryName(m_dte.Solution.FullName);
                     solutionName = System.IO.Path.GetFileNameWithoutExtension(m_dte.Solution.FullName);
                 }
    -            //string dbName = string.Format("Ganji.History-{0}.sdf", solutionName);
    +            m_localHistoryPath = FindLocalHistoryPath();
    +        }
    
    -            var basePath = PreparePath();
    -            var repositoryPath = System.IO.Path.Combine(basePath, "LocalHistory");
    -            var solutionPath = solutionBase;
    +        private string FindLocalHistoryPath()
    +        {
    +            var basePath = System.Environment.GetFolderPath(System.Environment.SpecialFolder.MyDocuments);
    +            if (m_dte.Solution != null)
    +            {
    +                basePath = System.IO.Path.GetDirectoryName(m_dte.Solution.FullName);
    +            }
    +            basePath = System.IO.Path.Combine(basePath, ".HistoryData");
    +            var contextPath = System.IO.Path.Combine(basePath, "LocalHistory");



Get rid of hard-coded path!

#### automark.VisualStudio/automark.VisualStudioPackage.cs

                 startInfo.FileName = executable;
    -            startInfo.Arguments = "C:/DEV/github/automark/Source/Extensions/automark.VisualStudio/.HistoryData/LocalHistory";
    +            startInfo.Arguments = m_localHistoryPath;
                 process.StartInfo = startInfo;
                 process.Start();

### Write output to file and open in external editor/browser

* [c# - Start browser from Windows service - Stack Overflow](http://stackoverflow.com/questions/15595823/start-browser-from-windows-service)
* [Open HTML file in C# application - Stack Overflow](http://stackoverflow.com/questions/11112592/open-html-file-in-c-sharp-application)

Write out the results of command to file, then open file. 

#### automark.VisualStudio/automark.VisualStudioPackage.cs

    +using System.Text;
    
     namespace ninlabs.automark.VisualStudio
     {
                 process.StartInfo = startInfo;
                 process.Start();
    
    +            StringBuilder builder = new StringBuilder();
                 while (!process.StandardOutput.EndOfStream)
                 {
                     string line = process.StandardOutput.ReadLine();
    +                builder.Append(line);
                 }
    +            System.IO.File.WriteAllText("automark-{0:yyyy-MM-dd}.md", builder.ToString());
    +            System.Diagnostics.Process.Start(pathToHtmlFile);
    
                 while (!process.StandardError.EndOfStream)
                 {


* [http://stackoverflow.com/questions/13389074/getting-gccs-output-from-command-line-when-running-it-through-c-sharp](http://stackoverflow.com/questions/13389074/getting-gccs-output-from-command-line-when-running-it-through-c-sharp)

Generate a temp file with a unique file name.

#### automark.VisualStudio/automark.VisualStudioPackage.cs

                     string line = process.StandardOutput.ReadLine();
                     builder.Append(line);
                 }
    -            System.IO.File.WriteAllText("automark-{0:yyyy-MM-dd}.md", builder.ToString());
    -            System.Diagnostics.Process.Start(pathToHtmlFile);
    +
    +            string tempMD =string.Format("automark-{0:yyyy-MM-dd-tt}.md", DateTime.Now);
    +            System.IO.File.WriteAllText(tempMD, builder.ToString());
    +            System.Diagnostics.Process.Start(tempMD);
    

If you want to redirect output, it turns out you need to turn off `UseShellExecute`.

#### automark.VisualStudio/automark.VisualStudioPackage.cs

                 startInfo.WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden;
                 startInfo.RedirectStandardOutput = true;
                 startInfo.RedirectStandardError = true;
    +            startInfo.UseShellExecute = false;
                 startInfo.FileName = executable;
                 startInfo.Arguments = m_localHistoryPath;
                 process.StartInfo = startInfo;

Something isn't working, let's display the error message from command program.

#### automark.VisualStudio/automark.VisualStudioPackage.cs

                 process.StartInfo = startInfo;
                 process.Start();
    
    +            StringBuilder buildForError = new StringBuilder();
    +            while (!process.StandardError.EndOfStream)
    +            {
    +                string line = process.StandardError.ReadLine();
    +                buildForError.Append(line);
    +            }
    +            var error = buildForError.ToString();
    +            if (error.Trim().Length > 0)
    +            {
    +                ShowMessage("automark", error);
    +            }
                 StringBuilder builder = new StringBuilder();
                 while (!process.StandardOutput.EndOfStream)
                 {
                 string tempMD =string.Format("automark-{0:yyyy-MM-dd-tt}.md", DateTime.Now);
                 System.IO.File.WriteAllText(tempMD, builder.ToString());
                 System.Diagnostics.Process.Start(tempMD);
    -            while (!process.StandardError.EndOfStream)
    -            {
    -                string line = process.StandardError.ReadLine();
    -            }
             }

Oops.  The path had **spaces** in it, which was being interpreted as multiple command line arguments.

#### automark.VisualStudio/automark.VisualStudioPackage.cs

                 startInfo.RedirectStandardError = true;
                 startInfo.UseShellExecute = false;
                 startInfo.FileName = executable;
    -            startInfo.Arguments = m_localHistoryPath;
    +            startInfo.Arguments = '"' + m_localHistoryPath + '"';
                 process.StartInfo = startInfo;
                 process.Start();
    

Ok.  But now the execution is **hanging**!  Turns out you should read `StandardOutput` before `StandardError` otherwise, it will just hang forever.

#### automark.VisualStudio/automark.VisualStudioPackage.cs

                 process.StartInfo = startInfo;
                 process.Start();
    
    +            StringBuilder builder = new StringBuilder();
    +            while (!process.StandardOutput.EndOfStream)
    +            {
    +                string line = process.StandardOutput.ReadLine();
    +                builder.Append(line);
    +            }

    -            StringBuilder builder = new StringBuilder();
    -            while (!process.StandardOutput.EndOfStream)
    -            {
    -                string line = process.StandardOutput.ReadLine();
    -                builder.Append(line);
    -            }

Finally, output!  But `ReadLine` was eating up the newline character, need to add it back.

#### automark.VisualStudio/automark.VisualStudioPackage.cs

                 while (!process.StandardOutput.EndOfStream)
                 {
                     string line = process.StandardOutput.ReadLine();
    -                builder.Append(line);
    +                builder.AppendLine(line);
                 }
    
                 StringBuilder buildForError = new StringBuilder();
                 while (!process.StandardError.EndOfStream)
                 {
                     string line = process.StandardError.ReadLine();
    -                buildForError.Append(line);
    +                buildForError.AppendLine(line);
                 }


`tt` actually only outputs `PM` or `AM`.  Need to add hour and minute too.

#### automark.VisualStudio/automark.VisualStudioPackage.cs
    
    -            string tempMD =string.Format("automark-{0:yyyy-MM-dd-tt}.md", DateTime.Now);
    +            string tempMD =string.Format("automark-{0:yyyy-MM-dd-hh-mm-tt}.md", DateTime.Now);
                 System.IO.File.WriteAllText(tempMD, builder.ToString());
                 System.Diagnostics.Process.Start(tempMD);

### Conclusion

You just watched how this file got generated from a Visual Studio extension that ran the result of a command line tool for extracting diffs from a local git repository and from Chrome visits to Stack Overflow, and turn it into markdown, suitable for publishing a blog post!

You can give [automark](https://github.com/chrisparnin/automark) a shot yourself!
