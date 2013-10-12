---
title: Using Tagging and Adornments for better TODOs in Visual Studio.
date: '2013-09-27'
description:
categories:
layout: "posts-narrative"
---

Visual Studio actually provides a powerful framework for making custom extensions to the editor while keeping the code surprisingly simple. 

Imagine if you wanted to make a `// TODO` note appear more distinctive as well as provide custom actions.

![TodoExample]({{urls.media}}/todo-ex.png)


With Visual Studio Extensions and MEF, you can make direct graphical changes to the editor with an `IAdornmentLayer`. But if you want to support custom editor actions and more interactivity, it is worth it to also create an `ITagger`. This post will show how you can insert tags into the `TextBuffer` and query those to render custom adornments.

#### Adornments

First, we create a class that will respond to text view creation events and create an `IAdornmentLayer`

##### TodoArdornmentFactory.cs

 We provide MEF attributes so that the class will merge into the  `IWpfTextViewCreationListener` MEF container.

    /// <summary>
    /// Establishes an <see cref="IAdornmentLayer"/> to place the adornment on and exports the <see cref="IWpfTextViewCreationListener"/>
    /// that instantiates the adornment on the event of a <see cref="IWpfTextView"/>'s creation
    /// </summary>
    [Export(typeof(IWpfTextViewCreationListener))]
    [ContentType("text")]
    [TextViewRole(PredefinedTextViewRoles.Document)]
    internal sealed class TodoArdornmentFactory : IWpfTextViewCreationListener
    {

MEF magic that will provide the adornment layer we can use when drawing adornments.

        /// <summary>
        /// Defines the adornment layer for the adornment. This layer is ordered 
        /// after the selection layer in the Z-order
        /// </summary>
        [Export(typeof(AdornmentLayerDefinition))]
        [Name("TodoArdornment")]
        [Order(After = PredefinedAdornmentLayers.Selection, Before = PredefinedAdornmentLayers.Text)]
        [TextViewRole(PredefinedTextViewRoles.Document)]
        public AdornmentLayerDefinition editorAdornmentLayer = null;

Create a new Adornment in response to text view creation.

        public void TextViewCreated(IWpfTextView textView)
        {
            new TodoArdornment(textView);
        }
    }

##### TodoArdornment.cs

Code responsible for deciding where to drawn adornments over text buffer and how to draw it.

The two most important things we need to handle in the constructor is getting the `TodoArdornment` layer we specified in the Factory, and listen for changes to the text editor.

        public TodoArdornment(IWpfTextView view)
        {
            _view = view;
            _layer = view.GetAdornmentLayer("TodoArdornment");

            //Listen to any event that changes the layout (text changes, scrolling, etc)
            _view.LayoutChanged += OnLayoutChanged;

Now we respond to text editor changes.  Note, this happens a lot, even with simple scrolling!

        private void OnLayoutChanged(object sender, TextViewLayoutChangedEventArgs e)
        {
            foreach (ITextViewLine line in e.NewOrReformattedLines)
            {
                this.CreateVisuals(line);
            }
        }

Next, we can scan code in the current viewport and check if it has a TODO.
But first, an aside.  Apparently, it not so simple to get string of text inside of a `ITextViewLine`.  Let's define a method `TryGetText` as provided by Jared Parson via twitter.

        /// <summary>
        /// This will get the text of the ITextView line as it appears in the actual user editable 
        /// document. 
        /// jared parson: https://gist.github.com/4320643
        /// </summary>
        public static bool TryGetText(IWpfTextView textView, ITextViewLine textViewLine, out string text)
        {
            var extent = textViewLine.Extent;
            var bufferGraph = textView.BufferGraph;
            try
            {
                var collection = bufferGraph.MapDownToSnapshot(extent, SpanTrackingMode.EdgeInclusive, textView.TextSnapshot);
                var span = new SnapshotSpan(collection[0].Start, collection[collection.Count - 1].End);
                //text = span.ToString();
                text = span.GetText();
                return true;
            }
            catch
            {
                text = null;
                return false;
            }
        }

Ok.  Let's match the line of text!

        Regex todoLineRegex = new Regex(@"\/\/\s*TODO\b");

        private void CreateVisuals(ITextViewLine line)
        {
            IWpfTextViewLineCollection textViewLines = _view.TextViewLines;
            string text = null;
            if (TryGetText(_view, line, out text))
            {
                var match = todoLineRegex.Match(text);
                if (match.Success)
                {
                    int matchStart = line.Start.Position + span.Index;
                    var span = new SnapshotSpan(_view.TextSnapshot, Span.FromBounds(matchStart, matchStart + match.Length));
                    SetBoundary(textViewLines, span);
                }
            }
        }

Finally, let's draw something!!!

        public void SetBoundary(IWpfTextViewLineCollection textViewLines, SnapshotSpan span)
        {
            Geometry g = textViewLines.GetMarkerGeometry(span);
            if (g != null)
            {
                GeometryDrawing drawing = new GeometryDrawing(_brush, _pen, g);
                drawing.Freeze();

                DrawingImage drawingImage = new DrawingImage(drawing);
                drawingImage.Freeze();

                Image image = new Image();
                image.Source = drawingImage;

                //Align the image with the top of the bounds of the text geometry
                Canvas.SetLeft(image, g.Bounds.Left);
                Canvas.SetTop(image, g.Bounds.Top);

                _layer.AddAdornment(AdornmentPositioningBehavior.TextRelative, span, null, image, null);
            }
        }


#### Tagging

Now, we could stop here if we just want the visual effect.  But if we want to perform actions and other interactions, we need to introduce tagging.

First we need to make some updates to our previous code, and then introduce  a tag provider, tags, and actions.

##### TodoArdornmentFactory.cs

This service will be used to help find tags in the editor.

        [Import]
        private IViewTagAggregatorFactoryService ViewTagAggregatorFactoryService { get; set; }

Update to pass in tag factory service.

        public void TextViewCreated(IWpfTextView textView)
        {
            new TodoArdornment(textView, ViewTagAggregatorFactoryService.CreateTagAggregator<TodoGlyphTag>( textView ));
        }

##### TodoArdornment.cs

Save tag service.

        public TodoArdornment(IWpfTextView view, ITagAggregator<TodoGlyphTag> aggregrator)
        {
            ...
            _createTagAggregator = aggregrator;


Instead of scanning code ourselves, we move that code the the tagger and instead ask the tag service for tags held in the span.

        private void CreateVisuals(ITextViewLine line)
        {
            ...
            foreach (var tag in this._createTagAggregator.GetTags(line.Extent))
            {
                foreach (var span in tag.Span.GetSpans(_view.TextSnapshot))
                {
                    SetBoundary(textViewLines, span);


##### TodoArdornmentFactory.cs

We create a tagger that will be associated with a text view.

    [Export(typeof(IViewTaggerProvider))]
    [ContentType("text")]
    [Order(Before = "default")]
    [TagType(typeof(TodoGlyphTag))]
    internal class TodoTagProvider : IViewTaggerProvider
    {
        Dictionary<Microsoft.VisualStudio.Text.Editor.ITextView, TodoTagger> taggers = new Dictionary<Microsoft.VisualStudio.Text.Editor.ITextView, TodoTagger>();

        public ITagger<T> CreateTagger<T>(Microsoft.VisualStudio.Text.Editor.ITextView textView, Microsoft.VisualStudio.Text.ITextBuffer buffer) where T : ITag
        {
            if (buffer == null || textView == null)
            {
                return null;
            }

            //make sure we are tagging only the top buffer 
            if (buffer == textView.TextBuffer)
            {
                if (!taggers.ContainsKey(textView))
                {
                    taggers[textView] = new TodoTagger(textView);
                }
                return taggers[textView] as ITagger<T>;
            }
            else return null;
        }
    }

##### TodoGlyphTag.cs

Create a Tag class, which doesn't do much at the moment.

    public class TodoGlyphTag : SmartTag
    {
        public TodoGlyphTag(SmartTagType smartTagType, ReadOnlyCollection<SmartTagActionSet> actionSets)
            : base(smartTagType, actionSets)
        {

        }
        internal void Execute(Point position, FrameworkElement frameworkElement)
        {
            // Smart Tag, Intellisense.
        }
    }

##### TodoTagger.cs

    public class TodoTagger : ITagger<TodoGlyphTag>
    {
        public event EventHandler<Microsoft.VisualStudio.Text.SnapshotSpanEventArgs> TagsChanged;
        Regex todoLineRegex = new Regex(@"\/\/\s*TODO\b");
        ITextView _textView;

        internal TodoTagger(ITextView textView)
        {
            _textView = textView;
            _textView.LayoutChanged += OnLayoutChanged;
        }

We listen and response to `_textView.LayoutChanged` and let others that this has caused tags to change.  This lets clients know to call `GetTags` so we can give them the newest sets of tags.

        private void OnLayoutChanged(object sender, TextViewLayoutChangedEventArgs e)
        {
            foreach (var span in e.NewOrReformattedSpans)
            {
                if (TagsChanged != null)
                {
                    TagsChanged(this, new SnapshotSpanEventArgs(span));
                }
            }
        }

`GetTags` does the basically the same thing that we used to do in TodoAdornment.cs

        public IEnumerable<ITagSpan<TodoGlyphTag>> GetTags(Microsoft.VisualStudio.Text.NormalizedSnapshotSpanCollection spans)
        {
            foreach (var span in spans)
            {
                String text = span.GetText();
                var match = todoLineRegex.Match(text);
                if (match.Success)
                {
                    var point = span.Start.Add(match.Index);
                    var spanNew = new SnapshotSpan(span.Snapshot, new Span(point.Position, match.Length));

Now... we want to do something different.  We want to provide a set of actions belonging to the tag, but only if the caret is current on the same line as the tag:

                    ITextViewLine line = null;
                    try
                    {
                        line = _textView.Caret.ContainingTextViewLine;
                    }
                    catch( Exception ex )
                    {
                        continue;
                    }
                    var actions = new ReadOnlyCollection<SmartTagActionSet>(new SmartTagActionSet[]{}.ToList());
                    if (line != null &&
                        _textView.Caret.ContainingTextViewLine.ContainsBufferPosition(span.Start))
                    {
                         actions = GetSmartTagActions(spanNew);
                    }

Now we can create our tag!

                    yield return new TagSpan<TodoGlyphTag>(spanNew, 
                        new TodoGlyphTag(SmartTagType.Ephemeral, actions)
                    );
                }
            }
        }

##### AttachAction.cs

Defining actions that will appear in the menu.

    internal class AttachAction : ISmartTagAction
    {
        private ITrackingSpan m_span;
        private string m_upper;
        private string m_display;
        private ITextSnapshot m_snapshot;
        private bool m_enabled = true;

        public AttachAction(ITrackingSpan span)
        {
            m_span = span;
            m_snapshot = span.TextBuffer.CurrentSnapshot;
            m_upper = span.GetText(m_snapshot).ToUpper();
            m_display = "Attach";
        }

This we can use to hook into external services...

        public void Invoke()
        {
            // Code for posting reminder to viewport...
            m_enabled = false;
        }

Rest of action properties.

        public string DisplayText
        {
            get { return m_display; }
        }
        public ImageSource Icon
        {
            get { return null; }
        }
        public bool IsEnabled
        {
            get { return m_enabled; }
        }

        public ISmartTagSource Source
        {
            get;
            private set;
        }

        public ReadOnlyCollection<SmartTagActionSet> ActionSets
        {
            get { return null; }
        }
    }

##### TodoTagger.cs

Back to the Tagger, let's get our actions for a tag.

        private ReadOnlyCollection<SmartTagActionSet> GetSmartTagActions(SnapshotSpan span)
        {
            List<SmartTagActionSet> actionSetList = new List<SmartTagActionSet>();
            List<ISmartTagAction> actionList = new List<ISmartTagAction>();

            ITrackingSpan trackingSpan = span.Snapshot.CreateTrackingSpan(span, SpanTrackingMode.EdgeInclusive);
            actionList.Add(new AttachAction(trackingSpan, this));
            SmartTagActionSet actionSet = new SmartTagActionSet(actionList.AsReadOnly());
            actionSetList.Add(actionSet);
            return actionSetList.AsReadOnly();
        }

#### Result

![attach]({{urls.media}}/attach.png)

Now, we can bring up an menu and use it to do other things, like attach the reminder to viewport, or link it to an external service like [Remember the Milk](rememberthemilk.com/).

![viewport]({{urls.media}}/viewport.png)
