+++
title = "Python 海龟绘图详解——圆和圆弧绘制总结"
date = "2019-12-04T18:13:59-08:00"
lastmod = "2020-01-04T17:33:12-08:00"
draft = false
url = "/draw-circle/"
slug = "draw-circle"
author = "judi0713@sina.com"
categories = ["海龟绘图详解"]
tags = ["turtle graphics 100 exercises", "少儿编程", "海龟绘图 100 题"]
wordpress_id = 756
wordpress_guid = "https://python.local/?p=756"
wordpress_status = "publish"
wordpress_type = "post"
wp_meta_views = "2233"
wp_meta_git_baidu_submit = "1"
wp_meta_bigfa_ding = "20"
+++

在 Python 海龟绘图中，绘制圆形和圆弧有两种方法，在这里对绘制方法进行一个总结。
<h2>1. 官方使用的绘制方法 circle</h2>
circle 方法是 Python 官方使用的方法。circle(半径，度数)。起始位置在圆的最下方，逆时针方向绘制。

例如，在绘制半径为 100 的圆形的时候。使用方法为
<pre class="prettyprint linenums">t.circle(100)</pre>
在绘制半圆的时候，实际是 360 度的圆的一半，使用方法为
<pre class="prettyprint linenums">t.circle(100, 180)</pre>
实际上在这个地方 circle 方法有第三个参数，官方文档解释说，<strong>圆实际是以其内切正多边形来近似表示的，其边的数量由 <em>steps</em> 指定（第三个参数）。我们在这里不需要管第三个参数。使用前两个即可。</strong>
<h2><span style="font-size: 14pt;">2. 使用循环绘制</span></h2>
利用循环的思想，当我们绘制多边形的时候，边数足够多的话，就逼近于圆了。

我们尝试绘制下 360 边形
<pre class="prettyprint linenums">for i in range(0,360):
    t.fd(1)
    t.rt(360/360)</pre>
这个地方有两个问题，一是，绘制速度慢，二是无法确定圆的半径。

<strong>绘制速度慢</strong>是因为我们实际上循环了 360 次，所以速度慢，可以考虑用 36 边形进行处理。

<strong>无法确定圆的半径</strong>可以通过计算来得到一个通解。

<strong>圆的周长是 2*Pi*r = 360*fd，fd = 2*Pi*r / 360 = 0.0174 * r，得到倍数是 0.0174，即在 fd 里填 0.0174*半径。</strong>

我们尝试绘制半径为 100 的圆形
<pre class="prettyprint linenums">for i in range(0,360):
    t.fd(0.0174*100)
    t.rt(360/360)</pre>
36 边形通过计算是 <strong>t.fd(0.174*半径)。</strong>

那么如何绘制半圆呢，实际上我们这个地方是通过循环的次数来控制圆的弧度。

使用方法为
<pre class="prettyprint linenums">for i in range(0,180):
    t.fd(0.0174*100)
    t.rt(1)</pre>
四分之一圆的话循环 90 次就可以了。
<h2>3. 两种方法的比较</h2>
在我个人教学中，推荐使用<strong>方法二。方法二是利用循环的思想逼近成圆。</strong>

<strong>理由是本身我们学习 Python 海龟绘图，更多的是为了熟悉角度知识，熟悉数值计算。</strong>

使用 for 循环绘制圆形，可以更好的理解逼近的思想以及熟悉循环的过程。虽然学生需要记忆数字 0.0174 以及写更多的程序，但是也更好的理解了程序本身。

同时，在方法二中，虽然使用 360 边形，速度会变慢，但是 360 和角度进行了结合，一圈是 360 度，旋转了 360 次。也方便进行计算。

对于方法一来说，需要通过调整半径和方向的正负来画圆，对于低年级学生来说，没有学习过负数的概念。而使用循环绘制圆，只有左右的概念。
<h2>4. 解答说明</h2>
Python 海龟绘图网已经进入到了圆的习题更新部分。

我会分别提供方法一和方法二的解答，供各位老师们选择授课。
