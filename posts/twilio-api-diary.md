---
title: Api Diaries - Twilio
date: '2013-05-20'
description:
categories:
tags: 
- interview
- api design
---

[Twilio](http://www.twilio.com/) makes telephony dead simple for developers.  A developer should be able to do cool things with their API, like sending text messages and setting up conference calls in under 5 minutes.  Such a company must live or die on API design.

I was very fortunate to speak with [Joel Franusic](https://twitter.com/jf) to learn how Twilio engages and understands developers when building their API. The following is a based on our conversation:

### How do they know how to get Api Design right?

#### Monitoring channels

> "We go where we are talked about"

- [getsatisfaction.com](http://forum.twilio.com/twilio)
- [Stack Overflow](http://stackoverflow.com/questions/tagged/twilio)
- [twitter](https://twitter.com/search/realtime?q=%23twilio)
- [Hacker News](https://www.hnsearch.com/search#request/all&q=twilio)
- email (lots)

Example tweets:

> If any #nodejs #twilio guys could help debug https://gist.github.com/1314454 and why it's saying not authenticated when I do the request

> .@twilio Why can't I send an SMS with the words "need to cancel" in it? I keep getting this error: http://www.twilio.com/docs/errors/21618 #janky

**There are some challenges with doing this**.  Currently, these channels are manually monitored by the support team.  Although all channels are attended, the issues and resolutions are not always curated and are often handled in different ways.  At the moment, product review meetings and decisions of customer feedback is based on the "semi-intuitive" recollection of issues, more often than on "hard-data".

#### API Usage data

API usage data is used internally to refactor API design and understand their users.  For example, one feature was found to be overly exploited by developers and as a result took too much bandwidth. Developers where using the API to request information about their own data usage (kinda meta).  This was changed to so that they instead [register a callback](http://www.twilio.com/docs/api/rest/usage-triggers) to know when they are approaching a limit.

#### Community building

Hackathons, meetups, and live demos are the preferred way to engage with developers.  There is still very much footwork in all this.

> "Prizes are bullshit."

Developers are often well off and are not always inspired by monetary rewards.  Prizes and contests are not commonly used, but if a prize is given away, items encouraging learning and hacking are used, such as Knuth books or a Raspberry Pi.

Closed betas are also used, to get early feedback from some of the heaviest (or most vocal) users.  For example, [Patrick McKenzie](http://www.kalzumeus.com/2011/12/19/productizing-twilio-applications/) was instrumental in calling for a solution for automated testing of twilio apps.  A closed beta was able to iron out many of the details and work for adding [this feature](http://www.twilio.com/docs/api/rest/test-credentials).

#### Company culture

Understanding developers is also ingrained into the company culture.
All new hires spend the first two weeks [handling support tickets](http://www.zendesk.com/blog/new-employees-answer-support-tickets).  Any employee (including non-devs) can earn street cred by demoing their own twilio app, earning the right to proudly wear the company's red track jacket.


## Conclusion

Companies built on apis must make developers happy.  Understanding developer's opinions, problems, and usage patterns still involve manual collection, on-the-ground engagement, and ad-hoc analytics.  There are many opportunities to learn and make this space better.
