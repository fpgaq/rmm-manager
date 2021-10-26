import { utils, constants } from 'ethers'
import { parseWei, Wei } from 'web3-units'

import { DEFAULT_CONFIG } from '../context'
import { computePoolId } from '../../shared/utilities'
import expect from '../../shared/expect'
import { runTest } from '../context'

const { strike, sigma, maturity, delta } = DEFAULT_CONFIG
let poolId: string
let delRisky: Wei, delStable: Wei
const delLiquidity = parseWei('10')

runTest('allocate', function () {
  beforeEach(async function () {
    await this.risky.mint(this.deployer.address, parseWei('1000000').raw)
    await this.stable.mint(this.deployer.address, parseWei('1000000').raw)
    await this.risky.approve(this.house.address, constants.MaxUint256)
    await this.stable.approve(this.house.address, constants.MaxUint256)

    await this.house.create(
      this.risky.address,
      this.stable.address,
      strike.raw,
      sigma.raw,
      maturity.raw,
      parseWei(1).sub(parseWei(delta)).raw,
      delLiquidity.raw
    )

    await this.house.deposit(
      this.deployer.address,
      this.risky.address,
      this.stable.address,
      parseWei('1000').raw,
      parseWei('1000').raw
    )

    poolId = computePoolId(this.engine.address, strike.raw, sigma.raw, maturity.raw)

    const res = await this.engine.reserves(poolId)
    delRisky = delLiquidity.mul(res.reserveRisky).div(res.liquidity)
    delStable = delLiquidity.mul(res.reserveStable).div(res.liquidity)
  })

  describe('success cases', function () {
    describe('when adding liquidity from margin', function () {
      it('allocates 1 LP share', async function () {
        await this.house.allocate(poolId, this.risky.address, this.stable.address, delRisky.raw, delStable.raw, true)
      })

      it('increases the position of the sender', async function () {
        await expect(
          this.house.allocate(poolId, this.risky.address, this.stable.address, delRisky.raw, delStable.raw, true)
        ).to.increasePositionLiquidity(this.house, this.deployer.address, poolId, delLiquidity.raw)
      })

      it('reduces the margin of the sender', async function () {
        await expect(
          this.house.allocate(poolId, this.risky.address, this.stable.address, delRisky.raw, delStable.raw, true)
        ).to.updateMargin(this.house, this.deployer.address, this.engine.address, delRisky.raw, false, delStable.raw, false)
      })

      it('emits the Allocate event', async function () {
        await expect(this.house.allocate(poolId, this.risky.address, this.stable.address, delRisky.raw, delStable.raw, true))
          .to.emit(this.house, 'Allocate')
          .withArgs(this.deployer.address, this.engine.address, poolId, delLiquidity.raw, delRisky.raw, delStable.raw, true)
      })

      it('does not reduces the balances of the sender', async function () {
        const riskyBalance = await this.risky.balanceOf(this.deployer.address)
        const stableBalance = await this.stable.balanceOf(this.deployer.address)
        await this.house.allocate(poolId, this.risky.address, this.stable.address, delRisky.raw, delStable.raw, true)

        expect(await this.risky.balanceOf(this.deployer.address)).to.equal(riskyBalance)
        expect(await this.stable.balanceOf(this.deployer.address)).to.equal(stableBalance)
      })
    })

    describe('when allocating from external', async function () {
      it('allocates 1 LP shares', async function () {
        await this.house.allocate(poolId, this.risky.address, this.stable.address, delRisky.raw, delStable.raw, false)
      })

      it('increases the position of the sender', async function () {
        await expect(
          this.house.allocate(poolId, this.risky.address, this.stable.address, delRisky.raw, delStable.raw, false)
        ).to.increasePositionLiquidity(this.house, this.deployer.address, poolId, delLiquidity.raw)
      })

      it('reduces the balances of the sender', async function () {
        const riskyBalance = await this.risky.balanceOf(this.deployer.address)
        const stableBalance = await this.stable.balanceOf(this.deployer.address)
        await this.house.allocate(poolId, this.risky.address, this.stable.address, delRisky.raw, delStable.raw, false)

        expect(await this.risky.balanceOf(this.deployer.address)).to.equal(riskyBalance.sub(delRisky.raw))
        expect(await this.stable.balanceOf(this.deployer.address)).to.equal(stableBalance.sub(delStable.raw))
      })

      it('does not reduces the margin', async function () {
        await expect(
          this.house.allocate(poolId, this.risky.address, this.stable.address, delRisky.raw, delStable.raw, false)
        ).to.updateMargin(
          this.house,
          this.deployer.address,
          this.engine.address,
          parseWei('0').raw,
          false,
          parseWei('0').raw,
          false
        )
      })

      it('emits the Allocate event', async function () {
        await expect(
          this.house.allocate(poolId, this.risky.address, this.stable.address, delRisky.raw, delStable.raw, false)
        )
          .to.emit(this.house, 'Allocate')
          .withArgs(this.deployer.address, this.engine.address, poolId, delLiquidity.raw, delRisky.raw, delStable.raw, false)
      })
    })
  })

  describe('fail cases', function () {
    it('fails to allocate 0 risky and 0 stable', async function () {
      await expect(
        this.house.allocate(poolId, this.risky.address, this.stable.address, '0', '0', true)
      ).to.revertWithCustomError('ZeroLiquidityError')
    })

    it('reverts if the engine is not deployed', async function () {
      await expect(this.house.allocate(poolId, this.stable.address, this.risky.address, '0', '0', true)).to.be.reverted
    })

    it('fails to allocate more than margin balance', async function () {
      await expect(
        this.house
          .connect(this.bob)
          .allocate(poolId, this.risky.address, this.stable.address, delRisky.raw, delStable.raw, true)
      ).to.be.reverted
    })

    it('fails to allocate more than external balances', async function () {
      await expect(
        this.house
          .connect(this.bob)
          .allocate(poolId, this.risky.address, this.stable.address, delRisky.raw, delStable.raw, false)
      ).to.be.reverted
    })

    it('reverts if the callback function is called directly', async function () {
      const data = utils.defaultAbiCoder.encode(
        ['address', 'address', 'address', 'uint256', 'uint256'],
        [this.house.address, this.risky.address, this.stable.address, '0', '0']
      )

      await expect(this.house.allocateCallback(0, 0, data)).to.be.revertedWith('NotEngineError()')
    })
  })
})
