# Fusion / same-stage evolvesTo edges - review list

Generated from `sameStageEvolutions` (see `EvolutionGraphConverter.py`'s
`classify_same_stage_evolutions`). Every evolvesTo edge where source and
target share the same stage gets split into:

- **fusion** - 2+ OTHER same-stage sources into the same target are ALSO
  still unclaimed after self-loop/mode-change/mutual are resolved first -
  the best signal for a real DNA/Jogress result. A target can still mix
  multiple continuities' own fusion rosters together (e.g. Omnimon's real
  WarGreymon+MetalGarurumon pair sits alongside 6 other unrelated sources
  from a different game - those 6 correctly land in mutual below instead).
- **mutual** - the reverse edge ALSO exists. Not a fusion - a tangled web of
  forms that all evolve into each other, usually one specific game's own
  shift-between-forms mechanic scraped flat.
- **mode-change** - one name is a prefix of the other (alternate form/weapon,
  not a real evolution).
- **other** - none of the above, INCLUDING a same-stage edge that's the only
  unclaimed source into its target (not enough signal alone to call it a
  fusion) - a genuine anomaly worth a manual look either way.

## Fusion (likely real)

**91 edges, 36 distinct targets.**

- **Aldamon** (Hybrid) <- Agunimon, BurningGreymon
- **BeoWolfmon** (Hybrid) <- KendoGarurumon, Lobomon
- **Chaosmon** (Mega) <- BanchoLeomon, Darkdramon, Varodurumon
- **Chaosmon Valdur Arm** (Mega) <- BanchoLeomon, Varodurumon
- **Daipenmon** (Hybrid) <- Korikakumon, Kumamon
- **EmperorGreymon** (Hybrid) <- Aldamon, BurningGreymon
- **Examon** (Mega) <- Breakdramon, Slayerdramon
- **ExMaquinamon** (Mega) <- Dalphomon, Metatromon
- **GraceNovamon** (Mega) <- Apollomon, Dianamon
- **Jesmon GX** (Mega) <- Gankoomon X, Jesmon X
- **JetSilphymon** (Hybrid) <- Kazemon, Zephyrmon
- **Kimeramon** (Ultimate) <- MetalGreymon (Virus), SkullGreymon
- **MetalGarurumon** (Mega) <- BlitzGreymon, CresGarurumon
- **MetalGreymon Cyberdramon** (Ultimate) <- Cyberdramon (2010 anime), MetalGreymon (2010 anime)
- **Millenniummon** (Mega) <- Machinedramon, Moon=Millenniummon
- **Mush-Upped MachLeomon** (Unknown) <- Forest Zone, MachLeomon
- **NeoMyotismon Darkness Mode (Shoutmon)** (Unknown) <- NeoMyotismon Darkness Mode One, NeoMyotismon Darkness Mode Two
- **Omegamon Alter-S** (Mega) <- BlitzGreymon, CresGarurumon, MetalGarurumon, WarGreymon
- **Omnimon** (Mega) <- MetalGarurumon, WarGreymon
- **Omnimon Merciful Mode** (Mega) <- HerculesKabuterimon, Magnadramon, Phoenixmon, Rosemon, Seraphimon, Vikemon
- **Omnimon Shuangwu** (Mega) <- MetalGarurumon, WarGreymon
- **Omnimon X** (Mega) <- MetalGarurumon, WarGreymon, WarGreymon X
- **Omnimon Zwart** (Mega) <- BlackMetalGarurumon, BlackWarGreymon, MetalGarurumon, WarGreymon
- **Ordinemon** (Mega) <- Ophanimon Falldown Mode, Raguelmon
- **RagnaLoardmon** (Mega) <- BryweLudramon, Durandamon
- **Rhihimon** (Hybrid) <- JagerLoweemon, Loweemon
- **RhinoKabuterimon** (Hybrid) <- Beetlemon, MetalKabuterimon
- **Ruthless Tuwarmon Beast Mode** (Unknown) <- Axemon, Digital Underworld
- **Shoutmon X3** (Champion) <- Ballistamon, Dorulumon, Shoutmon X2
- **Shoutmon X4** (Champion) <- Ballistamon, Dorulumon, Shoutmon X2, Shoutmon X3
- **Shoutmon X5B** (Mega) <- Beelzemon, Beelzemon (2010 anime)
- **Shoutmon X7** (Mega) <- Shoutmon DX, ZekeGreymon
- **UltimateChaosmon** (Mega) <- BanchoLeomon, Darkdramon, Kentaurosmon, Varodurumon
- **WarGreymon** (Mega) <- BlitzGreymon, CresGarurumon
- **XrosUpMervamon** (Mega) <- Beelzemon (2010 anime), Mervamon
- **ZeedMillenniummon** (Mega) <- Argomon (Mega), Blastmon, Lilithmon, Megidramon, Millenniummon, UltimateChaosmon

## Mutual / tangled webs (not fusion)

**162 edges, 98 distinct targets.**

- **Agunimon** (Hybrid) <- BurningGreymon
- **Akatorimon** (Champion) <- Kokatorimon
- **Alphamon** (Mega) <- Ouryumon
- **Angemon** (Champion) <- Ankylomon
- **Angewomon** (Ultimate) <- LadyDevimon
- **Ankylomon** (Champion) <- Angemon
- **Apemon** (Champion) <- MadLeomon
- **Apollomon** (Mega) <- Dianamon
- **Aquilamon** (Champion) <- Gatomon
- **Armamon** (Mega) <- Barbamon
- **BanchoLeomon** (Mega) <- Darkdramon, Kentaurosmon, Varodurumon
- **Barbamon** (Mega) <- Armamon
- **Bearmon** (Rookie) <- Guilmon
- **Beetlemon** (Hybrid) <- MetalKabuterimon
- **BlackMetalGarurumon** (Mega) <- BlackWarGreymon
- **BlackWarGreymon** (Mega) <- BlackMetalGarurumon
- **BlitzGreymon** (Mega) <- CresGarurumon
- **Breakdramon** (Mega) <- Slayerdramon
- **BryweLudramon** (Mega) <- Durandamon
- **BurningGreymon** (Hybrid) <- Agunimon
- **Chaos Lord** (Mega) <- ChaosBlackWarGreymon, ChaosMetalSeadramon, ChaosPiedmon
- **ChaosBlackWarGreymon** (Mega) <- Chaos Lord, ChaosMetalSeadramon, ChaosPiedmon
- **ChaosMetalSeadramon** (Mega) <- Chaos Lord, ChaosBlackWarGreymon, ChaosPiedmon
- **ChaosPiedmon** (Mega) <- Chaos Lord, ChaosBlackWarGreymon, ChaosMetalSeadramon
- **Cherrymon** (Ultimate) <- Megadramon
- **Cho-Hakkaimon** (Ultimate) <- Gokuumon, Sanzomon, Shawjamon
- **CresGarurumon** (Mega) <- BlitzGreymon
- **Dalphomon** (Mega) <- Metatromon
- **Darkdramon** (Mega) <- BanchoLeomon, Kentaurosmon, Varodurumon
- **DarkTyrannomon** (Champion) <- Kuwagamon
- **Devimon** (Champion) <- Kabuterimon, Ogremon
- **Dianamon** (Mega) <- Apollomon
- **Durandamon** (Mega) <- BryweLudramon
- **EmperorGreymon** (Hybrid) <- MagnaGarurumon
- **ExVeemon** (Champion) <- Stingmon
- **Fenriloogamon** (Mega) <- Kazuchimon
- **Frigimon** (Champion) <- MudFrigimon
- **Gatomon** (Champion) <- Aquilamon
- **Gokuumon** (Ultimate) <- Cho-Hakkaimon
- **GrapLeomon** (Ultimate) <- Pandamon
- **Guilmon** (Rookie) <- Bearmon
- **HerculesKabuterimon** (Mega) <- Magnadramon, Omnimon, Phoenixmon, Rosemon, Seraphimon, Vikemon
- **IceDevimon** (Champion) <- Icemon
- **Icemon** (Champion) <- IceDevimon
- **JagerLoweemon** (Hybrid) <- Loweemon
- **Kabuterimon** (Champion) <- Devimon
- **Karatenmon** (Ultimate) <- Taomon
- **Kazemon** (Hybrid) <- Zephyrmon
- **Kazuchimon** (Mega) <- Fenriloogamon
- **KendoGarurumon** (Hybrid) <- Lobomon
- **Kentaurosmon** (Mega) <- BanchoLeomon, Darkdramon, Varodurumon
- **Kogamon** (Champion) <- Ninjamon
- **Kokatorimon** (Champion) <- Akatorimon, Kuwagamon
- **Korikakumon** (Hybrid) <- Kumamon
- **Kumamon** (Hybrid) <- Korikakumon
- **Kuwagamon** (Champion) <- DarkTyrannomon, Kokatorimon
- **LadyDevimon** (Ultimate) <- Angewomon, MarineDevimon, Myotismon, SkullSatamon
- **Lobomon** (Hybrid) <- KendoGarurumon
- **Loweemon** (Hybrid) <- JagerLoweemon
- **MadLeomon** (Champion) <- Apemon, Troopmon
- **Magnadramon** (Mega) <- HerculesKabuterimon, Omnimon, Phoenixmon, Rosemon, Seraphimon, Vikemon
- **MagnaGarurumon** (Hybrid) <- EmperorGreymon
- **MarineDevimon** (Ultimate) <- LadyDevimon
- **Matadormon** (Ultimate) <- Mummymon
- **Megadramon** (Ultimate) <- Cherrymon
- **MetalGarurumon** (Mega) <- WarGreymon
- **MetalGreymon (Vaccine)** (Ultimate) <- WereGarurumon
- **MetalKabuterimon** (Hybrid) <- Beetlemon
- **Metatromon** (Mega) <- Dalphomon
- **Monzaemon** (Ultimate) <- WaruMonzaemon
- **MudFrigimon** (Champion) <- Frigimon
- **Mummymon** (Ultimate) <- Matadormon
- **Myotismon** (Ultimate) <- LadyDevimon, SkullSatamon
- **Ninjamon** (Champion) <- Kogamon
- **Ogremon** (Champion) <- Devimon
- **Omnimon** (Mega) <- HerculesKabuterimon, Magnadramon, Phoenixmon, Rosemon, Seraphimon, Vikemon
- **Ophanimon Falldown Mode** (Mega) <- Raguelmon
- **Ouryumon** (Mega) <- Alphamon
- **Pandamon** (Ultimate) <- GrapLeomon
- **Phoenixmon** (Mega) <- HerculesKabuterimon, Magnadramon, Omnimon, Rosemon, Seraphimon, Vikemon
- **Raguelmon** (Mega) <- Ophanimon Falldown Mode
- **Rosemon** (Mega) <- HerculesKabuterimon, Magnadramon, Omnimon, Phoenixmon, Seraphimon, Vikemon
- **Sanzomon** (Ultimate) <- Cho-Hakkaimon, Shawjamon
- **Seraphimon** (Mega) <- HerculesKabuterimon, Magnadramon, Omnimon, Phoenixmon, Rosemon, Vikemon
- **Shawjamon** (Ultimate) <- Cho-Hakkaimon, Sanzomon
- **Silphymon** (Ultimate) <- Sinduramon
- **Sinduramon** (Ultimate) <- Silphymon
- **SkullSatamon** (Ultimate) <- LadyDevimon, Myotismon
- **Slayerdramon** (Mega) <- Breakdramon
- **Stingmon** (Champion) <- ExVeemon
- **Taomon** (Ultimate) <- Karatenmon
- **Troopmon** (Champion) <- MadLeomon
- **Varodurumon** (Mega) <- BanchoLeomon, Darkdramon, Kentaurosmon
- **Vikemon** (Mega) <- HerculesKabuterimon, Magnadramon, Omnimon, Phoenixmon, Rosemon, Seraphimon
- **WarGreymon** (Mega) <- MetalGarurumon
- **WaruMonzaemon** (Ultimate) <- Monzaemon
- **WereGarurumon** (Ultimate) <- MetalGreymon (Vaccine)
- **Zephyrmon** (Hybrid) <- Kazemon

## Mode changes

**8 edges, 8 distinct targets.**

- **Alphamon Ouryuken** (Mega) <- Alphamon
- **Armamon Burst Mode** (Mega) <- Armamon
- **Fenriloogamon Takemikazuchi** (Mega) <- Fenriloogamon
- **Gallantmon Crimson Mode** (Mega) <- Gallantmon
- **Luminamon (Nene Version)** (Ultimate) <- Luminamon
- **MadLeomon Armed Mode** (Champion) <- MadLeomon
- **Omnimon Merciful Mode** (Mega) <- Omnimon
- **SkullKnightmon Cavalier Mode** (Champion) <- SkullKnightmon

## Other / unclassified

**63 edges, 63 distinct targets.**

- **Agunimon** (Hybrid) <- Flamemon
- **Alphamon Ouryuken** (Mega) <- Ouryumon
- **Apocalymon** (Mega) <- Puppetmon
- **Apollomon Darkness Mode** (Unknown) <- Axemon
- **Armamon Burst Mode** (Mega) <- Barbamon
- **BalliBeastmon** (Unknown) <- Beastmon
- **Barbamon** (Mega) <- Leviamon
- **Beelzemon** (Mega) <- Leviamon
- **Belphemon Rage Mode** (Mega) <- Leviamon
- **Boltboutamon** (Mega) <- Piedmon
- **Boltboutamon (Fusion)** (Ultra) <- Master
- **ChaosGrimmon** (Unknown) <- Grimmon
- **Daemon** (Mega) <- Leviamon
- **DarkKnightmon (Blastmon)** (Unknown) <- DarkKnightmon (Gulfmon)
- **DarkKnightmon (Gulfmon)** (Unknown) <- DarkKnightmon (Duskmon)
- **DarkKnightmon (Lilithmon)** (Unknown) <- DarkKnightmon (Blastmon)
- **DarknessBagramon** (Mega) <- Bagramon
- **DeadlyAxemon** (Champion) <- SkullKnightmon
- **DeckerGreymon** (Ultimate) <- MetalGreymon (2010 anime)
- **Dorbickmon Darkness Mode (Flarerizamon)** (Unknown) <- Dorbickmon Darkness Mode One
- **Dorbickmon Darkness Mode Two** (Unknown) <- Dorbickmon Darkness Mode One
- **Evilbeast Laylamon** (Unknown) <- Digital Underworld
- **ExoGrimmon** (Unknown) <- ChaosGrimmon
- **Fenriloogamon Takemikazuchi** (Mega) <- Kazuchimon
- **Forest Zone** (Unknown) <- MachLeomon
- **Gankoomon X** (Mega) <- Jesmon X
- **Gravimon Darkness Mode** (Unknown) <- Hippogriffomon
- **Greatest Cutemon** (Unknown) <- Beastmon
- **HiMachineDramon** (Mega) <- Machinedramon Kai
- **JetMervamon** (Mega) <- Mervamon
- **Kokatorimon** (Champion) <- Birdramon
- **Lilithmon** (Mega) <- Leviamon
- **Lobomon** (Hybrid) <- Strabimon
- **MadLeomon Armed Mode** (Champion) <- Troopmon
- **MagnaGarurumon** (Hybrid) <- BeoWolfmon
- **Maquinamon** (Rookie) <- Vemmon
- **MegaBlackShoutmon X7** (Unknown) <- BlackShoutmon X7
- **MusoKnightmon** (Ultimate) <- DarkKnightmon
- **Myotismon** (Ultimate) <- MarineDevimon
- **NeoMyotismon Darkness Mode Two** (Unknown) <- NeoMyotismon Darkness Mode One
- **Ogudomon** (Mega) <- Leviamon
- **PalaPandashou** (Unknown) <- Daxiongmaoshou
- **Plutomon (Fusion)** (Ultra) <- Master
- **Ruthless Tuwarmon** (Unknown) <- Axemon
- **Sanzomon** (Ultimate) <- Gokuumon
- **Shademon (Haruko Version)** (Unknown) <- Haruko Yamada
- **Shademon (Nene Version)** (Unknown) <- Nene Amano
- **ShadowSeraphimon** (Mega) <- Seraphimon
- **Shawjamon** (Ultimate) <- Gokuumon
- **Shoutmon DX** (Mega) <- ZekeGreymon
- **Shoutmon EX6** (Mega) <- ZekeGreymon
- **Shoutmon X2** (Champion) <- Ballistamon
- **Shoutmon X3GM** (Ultimate) <- MetalGreymon (2010 anime)
- **Shoutmon X4K** (Ultimate) <- Knightmon
- **SkullKnightmon Arrow Mode** (Unknown) <- Axemon
- **SkullKnightmon Mighty Axe Mode** (Champion) <- SkullKnightmon Cavalier Mode
- **SkullKnightmon Naginata Mode** (Unknown) <- Axemon
- **SkullSatamon** (Ultimate) <- MarineDevimon
- **Splashmon Darkness Mode 1** (Unknown) <- Splasher
- **SuperDarkKnightmon** (Unknown) <- AxeKnightmon
- **TalaPandashou** (Unknown) <- PalaPandashou
- **XrosUpArresterdramon (GigaBreakdramon)** (Unknown) <- GigaBreakdramon
- **XrosUpOpossummon** (Unknown) <- Opossumon

