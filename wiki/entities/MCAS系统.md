---
type: entity
created: 2026-06-09
sources:
  - "[[entities/波音737MAX]]"
updated: 2026-06-09T09:55
tags:
  - other
aliases:
  - Maneuvering Characteristics Augmentation System
  - 机动特性增强系统
---


# MCAS系统

## 基本信息

- **类型**: 飞行控制增稳系统
- **来源**: [[entities/波音737MAX]]

## 描述

MCAS系统，全称为机动特性增强系统（Maneuvering Characteristics Augmentation System），是由波音公司为737 MAX系列客机专门研发的飞行控制软件。该系统旨在解决737 MAX因采用更大直径发动机而导致的高速飞行时机头上扬问题，通过自动压低机头来维持飞机的稳定性。

MCAS系统通过读取飞机两侧的攻角传感器数据来判断是否存在失速风险。当系统检测到高攻角情况时，会自动触发并使飞机水平尾翼配平向下偏转，使机头下压。该系统的设计初衷是在极端飞行姿态下为飞行员提供辅助支持，但在实际运行中暴露出严重的局限性：系统仅依赖单一传感器的数据，且可以覆盖飞行员的反向操控输入。

2018年10月的Lion Air 610航班坠毁事故和2019年3月的埃塞俄比亚航空302航班坠毁事故，均与MCAS系统在接收到错误攻角数据后强行压低机头有直接关联。这两起事故共导致346人遇难，直接促成了737 MAX的全球停飞和波音公司面临的大规模安全审查。

## 相关实体

- [[entities/波音737MAX]] — 直接关联机型
- [[entities/波音737MAX|Lion Air 610航班]] — MCAS相关事故航班
- [[entities/波音737MAX|埃塞俄比亚航空302航班]] — MCAS相关事故航班

## 相关概念

- [[concepts/失速|失速]] — MCAS系统防范的核心危险状态
- [[concepts/攻角|攻角]] — MCAS系统运作所依赖的关键参数

## 来源提及

*(No source content available for this page)*