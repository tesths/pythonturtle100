---
title: "Python 海龟绘图：Turtle 库方法索引"
date: "2019-05-31T18:57:30-08:00"
lastmod: "2026-07-31T00:00:00+08:00"
slug: "turtle-index"
url: "/turtle-index/"
author: "judi0713@sina.com"
categories:
  - "常用方法索引"
tags:
  - "少儿编程"
description: "Python 海龟绘图 Turtle 方法索引，按官方文档整理常用方法、别名、作用说明和代码示例，方便快速查找和练习。"
draft: false
---

这是一份面向 Python 海龟绘图学习者的 Turtle 方法索引。内容参考 [Python 3.14 官方文档中的 Turtle 方法](https://docs.python.org/zh-cn/3.14/library/turtle.html#turtle-methods)，这里只整理海龟对象本身的方法，不包含 `Screen` 窗口方法。

下面的示例默认已经先写好：

```python
import turtle as t
```

每个方法单独占一个小节。右侧目录可以直接跳到某个方法。像 `forward()` 和 `fd()` 这种同义方法，正文会先讲主方法，别名放在句子里说明。示例会单独用 Python 代码块显示；如果有更短的别名，代码里优先使用短别名，并在后面用注释写出原本完整的 `t.长方法`。

## 移动和绘制

### forward(distance)

`forward(distance)` 用来让海龟沿着当前朝向前进，别名是 `fd()`。

```python
t.fd(100)  # t.forward(distance)
```

参数 `distance` 表示前进距离，可以是整数，也可以是小数。

### backward(distance)

`backward(distance)` 用来让海龟沿着当前朝向的反方向后退，别名是 `back()` 和 `bk()`。

```python
t.bk(80)  # t.backward(distance)
```

后退时，海龟的朝向不会改变。

### right(angle)

`right(angle)` 用来让海龟向右转动指定角度，别名是 `rt()`。

```python
t.rt(90)  # t.right(angle)
```

默认情况下，角度单位是度。

### left(angle)

`left(angle)` 用来让海龟向左转动指定角度，别名是 `lt()`。

```python
t.lt(120)  # t.left(angle)
```

画正多边形和星形时经常会用到它。

### goto(x, y=None)

`goto(x, y=None)` 用来把海龟移动到指定坐标，别名是 `setpos()` 和 `setposition()`。

```python
t.goto(100, 50)
```

如果画笔是落下的，移动过程中会画出线条。

### teleport(x, y=None, fill_gap=False)

`teleport(x, y=None, fill_gap=False)` 用来把海龟瞬移到指定坐标。

```python
t.teleport(100, 50)
```

它不会画出移动轨迹，这是 Python 3.12 新增的方法。

### setx(x)

`setx(x)` 用来只修改海龟的横坐标。

```python
t.setx(120)
```

调用后，海龟的纵坐标保持不变。

### sety(y)

`sety(y)` 用来只修改海龟的纵坐标。

```python
t.sety(-60)
```

调用后，海龟的横坐标保持不变。

### setheading(to_angle)

`setheading(to_angle)` 用来直接设置海龟朝向，别名是 `seth()`。

```python
t.seth(90)  # t.setheading(to_angle)
```

在标准模式下，`0` 度朝右，`90` 度朝上。

### home()

`home()` 用来让海龟回到原点，并恢复初始朝向。

```python
t.home()
```

原点坐标是 `(0, 0)`。

### circle(radius, extent=None, steps=None)

`circle(radius, extent=None, steps=None)` 用来画圆、圆弧或正多边形。

```python
t.circle(80)
```

参数 `extent` 可以控制圆弧角度，参数 `steps` 可以把圆近似成多边形。

### dot(size=None, color=None)

`dot(size=None, color=None)` 用来在当前位置画一个圆点。

```python
t.dot(20, "red")
```

不写大小时，圆点大小会根据画笔粗细自动决定。

### stamp()

`stamp()` 用来在当前位置盖下一个海龟印章。

```python
stamp_id = t.stamp()
```

这个方法会返回印章编号，后面可以用 `clearstamp()` 删除它。

### clearstamp(stampid)

`clearstamp(stampid)` 用来删除指定编号的印章。

```python
s = t.stamp(); t.clearstamp(s)
```

参数 `stampid` 必须是 `stamp()` 返回的编号。

### clearstamps(n=None)

`clearstamps(n=None)` 用来删除多个印章。

```python
t.clearstamps()
```

不传参数会删除全部印章，传正数会删除最早的几个，传负数会删除最新的几个。

### undo()

`undo()` 用来撤销最近一次海龟动作。

```python
t.undo()
```

能撤销多少步，取决于撤销缓冲区的设置。

### speed(speed=None)

`speed(speed=None)` 用来设置或读取绘图速度。

```python
t.speed("fastest")
```

速度可以写 `0` 到 `10`，也可以写 `"fastest"`、`"fast"`、`"normal"`、`"slow"`、`"slowest"`。

## 获取海龟的状态

### position()

`position()` 用来返回海龟当前位置，别名是 `pos()`。

```python
print(t.pos())  # t.position()
```

返回结果通常是形如 `(x, y)` 的坐标。

### towards(x, y=None)

`towards(x, y=None)` 用来计算海龟朝向某个点时需要面对的角度。

```python
print(t.towards(0, 0))
```

参数可以是坐标，也可以是另一只海龟。

### xcor()

`xcor()` 用来返回海龟当前的横坐标。

```python
print(t.xcor())
```

它只读取 `x` 值，不改变海龟状态。

### ycor()

`ycor()` 用来返回海龟当前的纵坐标。

```python
print(t.ycor())
```

它只读取 `y` 值，不改变海龟状态。

### heading()

`heading()` 用来返回海龟当前朝向。

```python
print(t.heading())
```

默认情况下，返回值以度为单位。

### distance(x, y=None)

`distance(x, y=None)` 用来返回海龟到某个点的距离。

```python
print(t.distance(30, 40))
```

如果海龟在原点，`distance(30, 40)` 的结果是 `50.0`。

## 设置与度量单位

### degrees(fullcircle=360.0)

`degrees(fullcircle=360.0)` 用来把角度单位设为“度”。

```python
t.degrees()
```

默认一圈是 `360` 度，也可以改成别的数，比如 `400`。

### radians()

`radians()` 用来把角度单位设为“弧度”。

```python
t.radians()
```

设置后，转向方法里的角度参数会按弧度理解。

## 绘图状态

### pendown()

`pendown()` 用来放下画笔，移动时会画线，别名是 `pd()` 和 `down()`。

```python
t.pd()  # t.pendown()
```

默认状态通常就是画笔落下。

### penup()

`penup()` 用来抬起画笔，移动时不会画线，别名是 `pu()` 和 `up()`。

```python
t.pu()  # t.penup()
```

它常用于把海龟移动到新的起点。

### pensize(width=None)

`pensize(width=None)` 用来设置或读取画笔粗细，别名是 `width()`。

```python
t.width(5)  # t.pensize(width=None)
```

不传参数时，会返回当前画笔粗细。

### pen(pen=None, **pendict)

`pen(pen=None, **pendict)` 用来一次设置或读取多项画笔属性。

```python
t.pen(pencolor="red", pensize=4)
```

它可以同时设置画笔颜色、粗细、速度、是否显示等属性。

### isdown()

`isdown()` 用来判断画笔是否处于落下状态。

```python
print(t.isdown())
```

返回值是 `True` 或 `False`。

## 颜色控制

### color(*args)

`color(*args)` 用来同时设置或读取画笔颜色和填充颜色。

```python
t.color("red", "yellow")
```

只写一个颜色时，线条和填充都会变成这个颜色；写两个颜色时，第一个是线条颜色，第二个是填充颜色。

### pencolor(*args)

`pencolor(*args)` 用来设置或读取画笔颜色。

```python
t.pencolor("blue")
```

它影响线条和多边形轮廓。

### fillcolor(*args)

`fillcolor(*args)` 用来设置或读取填充颜色。

```python
t.fillcolor("orange")
```

它通常会和填充方法一起使用。

## 填充

### filling()

`filling()` 用来判断当前是否正在填充。

```python
print(t.filling())
```

返回值是 `True` 或 `False`。

### fill()

`fill()` 用来自动开始并结束填充。

```python
with t.fill(): t.circle(40)
```

这是 Python 3.14 新增的方法，适合替代手动写 `begin_fill()` 和 `end_fill()` 的做法。

### begin_fill()

`begin_fill()` 用来开始记录需要填充的图形。

```python
t.begin_fill()
```

它要写在绘制封闭图形之前。

### end_fill()

`end_fill()` 用来结束填充，并给刚才记录的图形上色。

```python
t.begin_fill(); t.circle(40); t.end_fill()
```

只有调用 `end_fill()` 后，填充才会真正显示出来。

## 更多绘图控制

### reset()

`reset()` 用来清空绘图并重置海龟状态。

```python
t.reset()
```

调用后，海龟会回到原点，并恢复默认设置。

### clear()

`clear()` 用来清除当前海龟画过的内容。

```python
t.clear()
```

它不会改变海龟的位置、朝向和画笔设置。

### write(arg, move=False, align="left", font=("Arial", 8, "normal"))

`write(arg, move=False, align="left", font=("Arial", 8, "normal"))` 用来在当前位置写文字。

```python
t.write("Hello", align="center", font=("Arial", 16, "normal"))
```

它适合给图形加标签或说明。

## 可见性

### showturtle()

`showturtle()` 用来显示海龟图标，别名是 `st()`。

```python
t.st()  # t.showturtle()
```

显示后，绘图时能看到海龟的位置和方向。

### hideturtle()

`hideturtle()` 用来隐藏海龟图标，别名是 `ht()`。

```python
t.ht()  # t.hideturtle()
```

绘制复杂图形时，隐藏海龟可以减少视觉干扰。

### isvisible()

`isvisible()` 用来判断海龟是否可见。

```python
print(t.isvisible())
```

返回值是 `True` 或 `False`。

## 外观

### shape(name=None)

`shape(name=None)` 用来设置或读取海龟形状。

```python
t.shape("turtle")
```

内置形状包括 `"arrow"`、`"turtle"`、`"circle"`、`"square"`、`"triangle"`、`"classic"`。

### resizemode(rmode=None)

`resizemode(rmode=None)` 用来设置或读取大小调整模式。

```python
t.resizemode("auto")
```

可选值有 `"auto"`、`"user"`、`"noresize"`。

### shapesize(stretch_wid=None, stretch_len=None, outline=None)

`shapesize(stretch_wid=None, stretch_len=None, outline=None)` 用来设置或读取形状拉伸比例，别名是 `turtlesize()`。

```python
t.shapesize(2, 3, 1)
```

调用后，大小调整模式会变成 `"user"`。

### shearfactor(shear=None)

`shearfactor(shear=None)` 用来设置或读取海龟形状的剪切因子。

```python
t.shearfactor(0.3)
```

它只改变海龟外观，不改变移动方向。

### tiltangle(angle=None)

`tiltangle(angle=None)` 用来设置或读取海龟形状的倾角。

```python
t.tiltangle(45)
```

它改变的是图标方向，不是海龟真正的移动方向。

### tilt(angle)

`tilt(angle)` 用来在当前倾角基础上继续倾斜。

```python
t.tilt(30)
```

这个方法同样只改变外观。

### shapetransform(t11=None, t12=None, t21=None, t22=None)

`shapetransform(t11=None, t12=None, t21=None, t22=None)` 用来设置或读取形状变换矩阵。

```python
t.shapetransform(1, 0.3, 0, 1)
```

它适合做更高级的形状变形。

### get_shapepoly()

`get_shapepoly()` 用来获取当前形状的多边形坐标。

```python
print(t.get_shapepoly())
```

这个结果可以用于制作自定义形状。

## 使用事件

### onclick(fun, btn=1, add=None)

`onclick(fun, btn=1, add=None)` 用来设置点击海龟时执行的函数。

```python
t.onclick(lambda x, y: t.write((x, y)))
```

函数会收到点击位置的 `x` 和 `y`。

### onrelease(fun, btn=1, add=None)

`onrelease(fun, btn=1, add=None)` 用来设置在海龟上释放鼠标时执行的函数。

```python
t.onrelease(lambda x, y: t.fillcolor("red"))
```

它可以配合 `onclick()` 做按下和释放效果。

### ondrag(fun, btn=1, add=None)

`ondrag(fun, btn=1, add=None)` 用来设置拖动海龟时执行的函数。

```python
t.ondrag(t.goto)
```

点击并拖动海龟时，它就会跟着鼠标移动。

## 特殊海龟方法

### poly()

`poly()` 用来自动记录一段绘制过程形成的多边形。

```python
with t.poly(): t.forward(80)
```

这是 Python 3.14 新增的方法，会把首尾顶点连接起来。

### begin_poly()

`begin_poly()` 用来开始记录多边形顶点。

```python
t.begin_poly()
```

当前海龟位置会成为第一个顶点。

### end_poly()

`end_poly()` 用来停止记录多边形顶点。

```python
t.begin_poly(); t.forward(80); t.end_poly()
```

当前海龟位置会成为最后一个顶点。

### get_poly()

`get_poly()` 用来获取最近记录的多边形。

```python
t.begin_poly(); t.forward(80); t.end_poly(); print(t.get_poly())
```

它常配合自定义形状使用。

### clone()

`clone()` 用来克隆一只状态相同的新海龟。

```python
new_turtle = t.clone()
```

新海龟会有相同的位置、朝向和属性。

### getturtle()

`getturtle()` 用来返回当前海龟对象自身，别名是 `getpen()`。

```python
pet = t.getpen()  # t.getturtle()
```

在过程式写法里，这个方法常用来拿到匿名海龟。

### getscreen()

`getscreen()` 用来返回当前海龟所在的屏幕对象。

```python
screen = t.getscreen()
```

拿到屏幕后，就可以继续调用屏幕相关方法。

### setundobuffer(size)

`setundobuffer(size)` 用来设置或禁用撤销缓冲区。

```python
t.setundobuffer(50)
```

传入 `None` 可以禁用撤销缓冲区。

### undobufferentries()

`undobufferentries()` 用来返回撤销缓冲区里的条目数。

```python
print(t.undobufferentries())
```

它可以用来判断当前还能撤销多少步。

## 练习建议

刚开始不用一次记住所有方法。可以先用 `fd()`、`rt()`、`lt()` 画正方形、三角形和五角星，再用 `penup()`、`goto()`、`pendown()` 控制不同图形的位置。

熟悉移动和转向以后，可以继续用 `pencolor()`、`fillcolor()`、`begin_fill()`、`end_fill()` 给图形上色。再往后，可以试试 `shape()`、`shapesize()`、`stamp()` 做印章图案，或者用 `onclick()`、`ondrag()` 做可以点击和拖动的交互图形。
