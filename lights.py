#!/usr/bin/env python3
# NeoPixel library strandtest example
# Author: Tony DiCola (tony@tonydicola.com)
#
# Direct port of the Arduino NeoPixel library strandtest example.  Showcases
# various animations on a strip of NeoPixels.

import time
from random import randint
from neopixel import *
import math
import argparse
import thread

# LED strip configuration:
LED_COUNT = 60      # Number of LED pixels.
LED_PIN = 18      # GPIO pin connected to the pixels (18 uses PWM!).
LED_FREQ_HZ = 800000  # LED signal frequency in hertz (usually 800khz)
LED_DMA = 10      # DMA channel to use for generating signal (try 10)
LED_BRIGHTNESS = 255     # Set to 0 for darkest and 255 for brightest
# True to invert the signal (when using NPN transistor level shift)
LED_INVERT = False
LED_CHANNEL = 0       # set to '1' for GPIOs 13, 19, 41, 45 or 53

# Create NeoPixel object with appropriate configuration.
strip = Adafruit_NeoPixel(
    LED_COUNT, LED_PIN, LED_FREQ_HZ, LED_DMA, LED_INVERT, LED_BRIGHTNESS, LED_CHANNEL)
# Intialize the library (must be called once before other functions).
strip.begin()

# Used to get values for other functions


def wheel(pos):
    """Generate rainbow colors across 0-255 positions."""
    if pos < 85:
        return get_color(pos * 3, 255 - pos * 3, 0)
    elif pos < 170:
        pos -= 85
        return get_color(255 - pos * 3, 0, pos * 3)
    else:
        pos -= 170
        return get_color(0, pos * 3, 255 - pos * 3)


def get_mix(color_1, color_2, percent):
    """Get the mixed color between 2 colors"""
    r_diff = color_2[0] - color_1[0]
    g_diff = color_2[1] - color_1[1]
    b_diff = color_2[2] - color_1[2]
    r = color_1[0] + (r_diff * percent/100.0)
    g = color_1[1] + (g_diff * percent/100.0)
    b = color_1[2] + (b_diff * percent/100.0)
    return get_color(r, g, b)


def save_lights():
    lights_save = []
    for i in range(strip.numPixels()):
        lights_save.append(strip.getPixelColor(i))
    return lights_save

# Strip shifting


def lights_reverse():
    lights_save = [None] * strip.numPixels()
    for i in range(strip.numPixels()/2):
        lights_save[i] = strip.getPixelColor(i)
        strip.setPixelColor(i, 0)
        lights_save[strip.numPixels()-i -
                    1] = strip.getPixelColor(strip.numPixels()-i-1)
        strip.setPixelColor(strip.numPixels()-i-1, 0)
        strip.show()
        time.sleep(.005)
    high_start = int(math.floor(strip.numPixels()/2))
    low_start = int(math.ceil(strip.numPixels()/2)) - 1

    for i in range((strip.numPixels()/2)):
        strip.setPixelColor(low_start-i, lights_save[high_start+i])
        strip.setPixelColor(high_start+i, lights_save[low_start-i])
        strip.show()
        time.sleep(.005)


def lights_shift(amount, post_delay=0):
    if amount == 0:
        return
    lights_save = save_lights()
    for i in range(strip.numPixels()):
        new_i = i + amount
        if (new_i < 0):
            new_i += strip.numPixels()
        new_i = new_i % strip.numPixels()
        strip.setPixelColor(new_i, lights_save[i])
    strip.show()
    time.sleep(int(post_delay)/1000.0)


def lights_average_neighbors():
    lights_save = save_lights()
    for i in range(strip.numPixels()):
        average_value = [[None]*3] * strip.numPixels()
        for j in range(-1, 1):
            value_index = (i + j)
            if (value_index < 0):
                value_index += strip.numPixels()
            value_index = value_index % strip.numPixels()
            for k in range(3):
                average_value[i][k] = get_color_seperate(lights_save[i])[k]
            for k in range(3):
                average_value[i][k] /= 3
        strip.setPixelColor(i, get_color(
            average_value[i][0], average_value[i][1], average_value[i][2]))
        strip.show()


def rainbow(wait_ms, iterations):
    """Draw rainbow that fades across all pixels at once."""
    for j in range(256*iterations):
        for i in range(strip.numPixels()):
            strip.setPixelColor(i, wheel((i+j) & 255))
        strip.show()
        time.sleep(wait_ms/1000.0)


def lights_random_cycle(each, wait_ms, iterations):
    """Flashes random lights"""
    current_color = get_random_color()
    for i in range(iterations):
        for j in range(strip.numPixels()):
            if each == "true":
                current_color = get_random_color()
            strip.setPixelColor(j, current_color)
        strip.show()
        time.sleep(wait_ms/1000.0)


def get_random_color():
    """Generates a random color"""
    r = 0
    g = 0
    b = 0
    color_off = randint(0, 2)
    if color_off != 0:
        r = randint(0, 255)
    if color_off != 1:
        g = randint(0, 255)
    if color_off != 2:
        b = randint(0, 255)
    return get_color(r, g, b)


def lights_off():
    for i in range(strip.numPixels() / 2 + 1):
        strip.setPixelColor(i, 0)
        strip.setPixelColor(LED_COUNT - i, 0)
        strip.show()
        time.sleep(6/1000.0)


def lights_set_color(r, g, b):
    for i in range(strip.numPixels()):
        strip.setPixelColor(i, get_color(r, g, b))
    strip.show()


def lights_pulse(r, g, b, direction, wait_ms, length, layer=True):
    previous = []
    if direction == 1:
        for i in range(strip.numPixels()+length):
            previous.append(strip.getPixelColor(i))
            j = i - length
            strip.setPixelColor(i, get_color(r, g, b))
            if j >= 0:
                if layer:
                    strip.setPixelColor(j, previous[j])
                else:
                    strip.setPixelColor(j, 0)
            time.sleep(wait_ms/1000.0)
            strip.show()
    else:
        for i in reversed(range(strip.numPixels()+length)):
            j = i - length
            previous.append(strip.getPixelColor(j))
            if j >= 0:
                strip.setPixelColor(j, get_color(r, g, b))
            if i < strip.numPixels():
                if layer:
                    strip.setPixelColor(i, previous[strip.numPixels()-i-1])
                else:
                    strip.setPixelColor(i, 0)
            time.sleep(wait_ms/1000.0)
            strip.show()


def lights_wipe(r, g, b, direction, wait_ms):
    if direction == 1:
        for i in range(strip.numPixels()):
            strip.setPixelColor(i, get_color(r, g, b))
            strip.show()
            time.sleep(wait_ms/1000.0)
    elif direction == -1:
        for i in reversed(range(strip.numPixels())):
            strip.setPixelColor(i, get_color(r, g, b))
            strip.show()
            time.sleep(wait_ms/1000.0)


def lights_chase(r, g, b, wait_ms, iterations):
    """Movie theater light style chaser animation."""
    for j in range(iterations):
        for q in range(3):
            for i in range(0, strip.numPixels(), 3):
                strip.setPixelColor(i+q, get_color(r, g, b))
            strip.show()
            time.sleep(wait_ms/1000.0)
            for i in range(0, strip.numPixels(), 3):
                strip.setPixelColor(i+q, 0)


def lights_rainbow_cycle(wait_ms, iterations):
    """Draw rainbow that uniformly distributes itself across all pixels."""
    for j in range(256*iterations):
        for i in range(strip.numPixels()):
            strip.setPixelColor(
                i, wheel((int(i * 256 / strip.numPixels()) + j) & 255))
        strip.show()
        time.sleep(wait_ms/1000.0)


def lights_rainbow_chase(wait_ms):
    """Rainbow movie theater light style chaser animation."""
    for j in range(256):
        for q in range(3):
            for i in range(0, strip.numPixels(), 3):
                strip.setPixelColor(i+q, wheel((i+j) % 255))
            strip.show()
            time.sleep(wait_ms/1000.0)
            for i in range(0, strip.numPixels(), 3):
                strip.setPixelColor(i+q, 0)


def sleepListenForBreak(wait_ms, this_id):
    while wait_ms > 0:
        if wait_ms < 100:
            time.sleep(wait_ms/1000.0)
        else:
            time.sleep(wait_ms/1000.0)
        if this_id != animation_id.get():
            return True
        wait_ms -= 100
        return False

def lights_mix_switch(wait_ms, colors, this_id):
    """Cycle fading between multiple colors"""
    if wait_ms < 0:
        lights_mix_switch_instant(abs(wait_ms), colors)
        return
    for k in range(0, len(colors) - 1):
        percent = 0
        for j in range(100):
            for i in range(0, strip.numPixels()):
                strip.setPixelColor(i, get_mix(
                    colors[k], colors[k+1], percent))
            strip.show()
            percent += 1
            #time.sleep((wait_ms/1000.0)/100.0)
            if sleepListenForBreak(wait_ms/100.0, this_id):
                return


def lights_mix_switch_instant(wait_ms, colors):
    for j in range(0, len(colors)):
        for i in range(0, strip.numPixels()):
            strip.setPixelColor(i, get_mix(
                    colors[j], colors[j], 100))
        strip.show()
        time.sleep(wait_ms/1000.0)

def lights_set_random():
    for i in range(strip.numPixels()):
        strip.setPixelColor(i, get_random_color())
        strip.show()

def lights_set(i, r, g, b):
    strip.setPixelColor(i, get_color(r, g, b))
    strip.show()

def lights_set_multiple():
    pass

# Other

def refresh_strip():
    for i in range(strip.numPixels()):
        r = get_color_seperate(strip.g)
        strip.setPixelColor(i, int(strip.getPixelColor(i)*.5))
    strip.show()

def get_color(r, g, b):
    """ Gets int value of color """
    # Swaps g and r since strip uses grb
    return ((int(g) * 65536) + (int(r) * 256) + int(b))

def get_color_seperate(value):
    r = (value >> 16) & 0xFF
    g = (value >> 8) & 0xFF
    b = value & 0xFF
    return (g, r, b)  # Swaps g and r since strip uses grb

def set_brightness(value):
    strip.setBrightness(value)
    strip.show()

class AnimationID:
    def __init__(self):
        self.id = 0

    def increment(self):
        self.id += 1

    def get(self):
        return self.id

animation_id = AnimationID()

# Run on Startup
strip.setBrightness(75)

lights_wipe(255, 0, 0, 1, 2)
lights_wipe(0, 255, 0, 1, 2)
lights_wipe(0, 0, 255, 1, 2)
lights_wipe(0, 0, 0, 1, 2)
