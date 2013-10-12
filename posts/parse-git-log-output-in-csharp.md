---
title: Parse git log output in C#
date: '2013-09-05'
description:
categories:
layout: "posts-narrative"
---

A simple example for parsing the output of git log in pure C#.

### Getting git log output

Get output of `git log --name-status` by specifying path of git repo.

        public static string ListShaWithFiles(string path)
        {
            var output = RunProcess(string.Format(" --git-dir={0}/.git --work-tree={1} log --name-status", path.Replace("\\", "/"), path.Replace("\\", "/")));
            return output;
        }

Helper for getting command line output

        private static string RunProcess(string command)
        {
            // Start the child process.
            Process p = new Process();
            // Redirect the output stream of the child process.
            p.StartInfo.UseShellExecute = false;
            p.StartInfo.RedirectStandardOutput = true;
            p.StartInfo.FileName = Config.GitExectuable;
            p.StartInfo.Arguments = command;
            p.Start();
            // Read the output stream first and then wait.
            string output = p.StandardOutput.ReadToEnd();
            p.WaitForExit();
            return output;
        }

### Parse output

Basic parse loop for parsing a commit.  Will show how to populate next.

            using (var strReader = new StringReader(output))
            {
                do
                {
                    var line = strReader.ReadLine();

                    if( line.StartsWith("commit ") )
                    {
                    }

                    if ( StartsWithHeader(line) )
                    {
                    }

                    if (string.IsNullOrEmpty(line) )
                    {
                        // commit message divider
                    }

                    if (line.Length > 0 && line[0] == '\t')
                    { 
                        // commit message.
                    }

                    if (line.Length > 1 && Char.IsLetter(line[0]) && line[1] == '\t')
                    {
						// file status
                    }
                }
                while (strReader.Peek() != -1);
            }
        }

Helper function to help check if a line is a header.

        private bool StartsWithHeader(string line)
        {
            if( line.Length > 0 && char.IsLetter( line[0] ) )
            {
                var seq = line.SkipWhile( ch => Char.IsLetter(ch) && ch != ':' );
                return seq.FirstOrDefault() == ':';
            }
            return false;
        }

### Storing results.


Class for holding commits 

    public class GitCommit
    {
        public GitCommit()
        {
            Headers = new Dictionary<string, string>();
            Files = new List<GitFileStatus>();
            Message = "";
        }

        public Dictionary<string, string> Headers { get; set; }
        public string Sha { get; set; }
        public string Message { get; set; }
        public List<GitFileStatus> Files { get; set; }
    }

and File status

    public class GitFileStatus
    {
        public string Status { get; set; }
        public string File { get; set; }
    }

Populating results

            GitCommit commit = null;
            var commits = new List<GitCommit>();
            bool processingMessage = false;
            using (var strReader = new StringReader(output))
            {
                do
                {
                    var line = strReader.ReadLine();

                    if( line.StartsWith("commit ") )
                    {
                        if (commit != null)
                            commits.Add(commit);
                        commit = new GitCommit();
                        commit.Sha = line.Split(' ')[1];
                    }

                    if ( StartsWithHeader(line) )
                    {
                        var header = line.Split(':')[0];
                        var val = string.Join(":",line.Split(':').Skip(1)).Trim();

                        // headers
                        commit.Headers.Add(header, val);
                    }

                    if (string.IsNullOrEmpty(line) )
                    {
                        // commit message divider
                        processingMessage = !processingMessage;
                    }

                    if (line.Length > 0 && line[0] == '\t')
                    { 
                        // commit message.
                        commit.Message += line;
                    }

                    if (line.Length > 1 && Char.IsLetter(line[0]) && line[1] == '\t')
                    {
                        var status = line.Split('\t')[0];
                        var file = line.Split('\t')[1];
                        commit.Files.Add(new GitFileStatus() { Status = status, File = file } );
                    }
                }
                while (strReader.Peek() != -1);
            }
            if (commit != null)
                commits.Add(commit);

            return commits;
        }


### Run it all and print back results

        string path = @"C:\DEV\github\Codegrams";
        if (args.Length > 0)
            path = args[0];
        var output = GitCommands.ListShaWithFiles(path);

        var parser = new ParseGitLog();
        var commits = parser.Parse(output);

        Console.WriteLine(commits.Count);
        foreach (var commit in commits)
        {
            commit.Print();
        }

Print helper

        public void Print()
        {
            Console.WriteLine("commit " + Sha);
            foreach (var key in Headers.Keys)
            {
                Console.WriteLine(key + ":" + Headers[key]);
            }
            Console.WriteLine();
            Console.WriteLine(Message);
            Console.WriteLine();
            foreach (var file in Files)
            {
                Console.WriteLine(file.Status + "\t" + file.File);
            }
        }

