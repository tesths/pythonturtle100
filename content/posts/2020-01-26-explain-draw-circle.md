+++
title = "Python 海龟绘图详解——Cirlcle 方法画圆"
date = "2020-01-26T18:50:45-08:00"
lastmod = "2020-04-23T17:49:59-08:00"
draft = false
url = "/explain-draw-circle/"
slug = "explain-draw-circle"
author = "judi0713@sina.com"
categories = ["海龟绘图详解"]
tags = []
wordpress_id = 811
wordpress_guid = "https://python.local/?p=811"
wordpress_status = "publish"
wordpress_type = "post"
thumbnail = "/wp-content/uploads/2020/01/202001270207218.png"
wp_meta_git_baidu_submit = "1"
wp_meta_views = "1753"
wp_meta_bigfa_ding = "23"
+++

在 Python 海龟绘图中，Cirlcle 方法是绘制圆的方法之一，也是官方推荐的方法。在这里对绘制进行一个总结。
<h2>1. Circle 方法填写不同参数值绘制出的图</h2>
<figure class="wp-caption aligncenter" style="max-width: 432px"><a href="/wp-content/uploads/2020/01/202001270207218.png"><img class="wp-image-814 size-full" src="/wp-content/uploads/2020/01/202001270207218.png" alt="python tuetle circle" width="432" height="312" /></a><figcaption>Python 海龟绘图详解—— Cirlcle 方法画圆</figcaption></figure>

上图的程序代码是
<pre class="prettyprint linenums">import turtle as t
t.circle(100, 90)
t.home()
t.circle(100, -90)
t.home()
t.circle(-100, 90)
t.home()
t.circle(-100, -90)
t.home()
</pre>
<h2>2. circle 方法说明</h2>
在 circle 方法中，第一个参数是圆的半径，第二个方法是圆的角度。这两个参数都是可正可负。

<strong>当第二个参数为正数时，第一个参数如果为正数，则是逆时针向前画圆。</strong>

<strong>当第二个参数为正数时，第一个参数如果为负数，则是顺时针向后画圆。</strong>

<strong>当第二个参数为负数时，第一个参数如果为正数，则是顺时针向前画圆。</strong>

<strong>当第二个参数为负数时，第一个参数如果为负数，则是逆时针向后画圆。</strong>
<h2>3. 记忆方法</h2>
总结为：

<strong>角度为正向前走 </strong><strong>负负得正逆时针</strong>

<strong>角度为正数的时候都是顺着当前的方向向前走，两个参数都为负数，两个参数都为正数的时候，时顺时针画。</strong>

对于记忆来说，我们要记住的是当第一个第二个参数都为正时的情况。

当都为正数是，是按照逆时针的方向，向前画了一个圆。

当我们不知道半径可以填写负数的时候，我们尝试修改角度的负数，此时发现，是在上一个圆的基础上，倒着画了一个。

<strong>意味着当第一个参数为正数的时候，圆实际上是同一个圆，只是从同一个点出发，一个正向画一个反向画。</strong>

<strong>只要当角度是正数，我们都是顺着向前画的</strong>。由于半径正数时逆时针，那么半径负数就是顺时针了。

当两个都为负数的时候，首先根据上一句话，<strong>角度是负数，一定是倒着向后走的</strong>。其次，由于两个正数时逆时针，我们两个负数，负负得正了，所以也为逆时针。

<strong>授课时可直接将口诀推出，然后进行详细的讲解。</strong>
