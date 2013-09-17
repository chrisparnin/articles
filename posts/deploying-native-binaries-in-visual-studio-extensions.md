---
title: Deploying native binaries with Visual Studio extensions
date: '2013-09-17'
description:
categories:
---

If your extension depends on a native binary, you have to do some tricks to get the binary to be copied into the experimental hive directory for testing and including in your VSIX for deployment.

[nulltoken](https://github.com/nulltoken) had given out a helpful hint on using msbuild directives to stream-line this process:

> You might be willing to glance at
> https://github.com/libgit2/libgit2sharp/blob/vNext/LibGit2Sharp/CopyNativeDependencies.targets and the way it's being used in `LibGit2Sharp.Tests.csproj`

I adapted this approach for my project. First, I define a reference to native binaries that live in the nuget directory.  `$(MSBuildProjectDirectory)` refers to directory containing the .csproj file.

    <PropertyGroup>
        <NativeBinariesDirectory>$(MSBuildProjectDirectory)\..\packages\LibGit2Sharp.0.13.0.0\NativeBinaries</NativeBinariesDirectory>
    </PropertyGroup>

The nice thing about using MSBuild directives is that you can use pattern matching to include projects.
`$(NativeBinariesDirectory)\**\*.*"` specifies all the native files I want to include in the project.
The `Link` directive describes how the file is displayed in the solution explorer.  `CopyToOutputDirectory` is used to copy the binaries in the output bin directory (but not vsix).  `IncludeInVSIX` is what makes sure these files will be included in the experimental hive extension folder as well as the packaged .VSIX file.

    <ItemGroup>
        <Content Include="$(NativeBinariesDirectory)\**\*.*">
            <Link>NativeBinaries\%(RecursiveDir)%(Filename)%(Extension)</Link>
            <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
            <IncludeInVSIX>true</IncludeInVSIX>
        </Content>
    </ItemGroup>

Finally, I initially tried nulltoken's solution directly, but couldn't find out how to get it to work in the context of a visual studio extension.


[Relevant Stack Overflow quesition](http://stackoverflow.com/questions/1292351/including-content-files-in-csproj-that-are-outside-the-project-cone)
