+++
title = "Python 海龟绘图详解——多角星绘制总结"
date = "2019-10-20T17:58:03-08:00"
lastmod = "2019-12-04T17:07:06-08:00"
draft = false
url = "/draw-multi-angle-star/"
slug = "draw-multi-angle-star"
author = "judi0713@sina.com"
categories = ["海龟绘图详解"]
tags = ["turtle graphics 100 exercises", "少儿编程", "海龟绘图 100 题"]
wordpress_id = 414
wordpress_guid = "https://python.local/?p=414"
wordpress_status = "publish"
wordpress_type = "post"
wp_meta_views = "1089"
wp_meta_git_baidu_submit = "1"
wp_meta_bigfa_ding = "11"
+++

在 Python 海龟绘图中，绘制多角星是个常见问题，在这里对多角星进行总结。
<h2>绘制方法</h2>
例如，在绘制边长为 100 的<strong>五角星</strong>的时候。使用方法为
<pre class="prettyprint linenums">for i in range(0,5):
    t.fd(100)
    t.rt(180-180/5)</pre>
例如，在绘制边长为 100 的七<strong>角星</strong>的时候。使用方法为
<pre class="prettyprint linenums">for i in range(0,7):
    t.fd(60)
    t.rt(180-180/7)</pre>
<h2><span style="font-size: 14pt;">为什么没有偶数角星</span></h2>
偶数角星，不能一笔画。在一笔画问题中，要求图中交叉点的顶点数目等于0或者2。

而偶数角星不符合一笔画的要求。
<h2>在多角形绘制中，为什么转过的角度是 180-180 / n 呢？</h2>
每一个多角星都会有一个外接圆。<b>圆周角</b>的度数等于它所对的<b>弧度</b>数的一半。所以 n 角星，就是 <strong>360 / 2 / n=180 / n。</strong>

则转过的角度是 <strong>180-180 / n。</strong>
