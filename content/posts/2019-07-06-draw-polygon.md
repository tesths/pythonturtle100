+++
title = "Python 海龟绘图——多边形绘制总结"
date = "2019-07-06T06:30:12-08:00"
lastmod = "2021-10-05T03:39:12-08:00"
draft = false
url = "/draw-polygon/"
slug = "draw-polygon"
author = "judi0713@sina.com"
categories = ["海龟绘图详解"]
tags = ["turtle graphics 100 exercises", "少儿编程", "海龟绘图 100 题"]
wordpress_id = 225
wordpress_guid = "https://python.local/?p=225"
wordpress_status = "publish"
wordpress_type = "post"
wp_meta_views = "1557"
wp_meta_git_baidu_submit = "1"
wp_meta_bigfa_ding = "9"
+++

在 turtle 作图中，经常会遇到多边形。在这里对多边形的画法进行一个总结。
<h2>方法一 使用循环绘制</h2>
在 Python 海龟绘图中，可以使用循环绘制多边形。在这里可以利用公式 <strong>重复次数*转过角度=360。</strong>

例如，在绘制边长为 100 的<strong>五边形</strong>的时候。使用方法为
<pre class="prettyprint linenums">for i in range(0,5):
    t.fd(100)
    t.rt(360/5)</pre>
例如，在绘制边长为 60 的<strong>六边形</strong>的时候。使用方法为
<pre class="prettyprint linenums">for i in range(0,6):
    t.fd(60)
    t.rt(360/6)</pre>
此处在记忆中，可用三角形，正方形进行辅助记忆。

三角形重复 3 次，每次转过的角度为 120 度。

正方形重复 4 次，每次转过的角度为 90 度。

<strong>3*120=4*90=360</strong>。从而记忆 360 度这个关键角度。
<h3>在多边形绘制中，为什么转过的角度是 360/n 呢？</h3>
假设一个正多边形有 n 条边，正多边形的内角和为 $(n-2)*180$

那么每个角的度数则为 $\frac{(n-2)*180}{n}=180+\frac{360}{n}$

每个角的转角是 $180-(180-\frac{360}{n})=\frac{360}{n}$
<h2>方法二 使用 turtle circle 方法</h2>
使用 turtle 的 circle() 方法，可以进行绘制多边形。

circle() 函数有三个参数，依次是
<ul>
 	<li><strong>radius</strong> -- 一个数值</li>
 	<li><strong>extent</strong> -- 一个数值 (或 None)</li>
 	<li><strong>steps</strong> -- 一个整型数 (或 None)</li>
</ul>
circle() 方法的本质是以其内切正多边形来近似表示圆。第一个参数为圆的半径，第二个参数是圆转过的角度，第三个参数为边的数量。在使用时，只填写第一个和第三个参数即可。具体使用方法如下。

例如，在绘制<strong>六边形</strong>的时候。使用方法为
<pre class="prettyprint linenums">t.circle(100,None,6)</pre>
但是此种方法无法在已有知识体系下明确多边形的边长（具体边长的值为 <strong>$d=2*{r}*{sin(\frac{180} {n})}$</strong>）
<h2>总结</h2>
两张方法都可以画出多边形。但方法二无法明确边长，因此推荐使用方法一完成日常绘图。
