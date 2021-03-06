import time

from sequences.sequence_base import SequenceBase, Preset

class Sequence(SequenceBase):
    def __init__(self, sequencer, send, config) -> None:
        super().__init__(sequencer, send, config)

    def off(self):
        self.sequencer.stopAll(True)
        self.color()

    def blink(self, colors=["red", "green"], delay=500):
        for color in colors:
            self.color(color=color)
            self.sleep(delay / 1000)

    def test_a(self):
        self.pulse()

    def test_b(self):
        self.wipe(**Preset['wipe_green'])
        self.sleep(4)
        self.wipe(**Preset['wipe_green_r'])
        self.sleep(4)
        self.color(**Preset['color_blue'])
        self.sleep(2)

    def test_c(self):
        self.cycle()

    def test_d(self):
        self.pulse()
        self.sleep(4)
        self.pulse(**Preset['pulse_red'])

    def test_e(self):
        self.rainbow()
        self.sleep(3)
        self.color()
        self.sleep(2)
        
