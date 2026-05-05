export class GameState {
  public starsCollected: number = 0;
  public totalStars: number = 5;
  public level: number = 1;
  public seed: number = Math.random();
  
  public globalStars: number = 0;
  public planetsVisited: number = 1;
  public unicornsCollected: number = 0;
  public unicornsMissed: number = 0;

  public resetLevel() {
    this.starsCollected = 0;
    this.seed = Math.random();
    this.level++;
    this.planetsVisited++;
    this.updateUI();
  }

  public collectStar() {
    this.starsCollected++;
    this.globalStars++;
    this.updateUI();
  }

  public collectUnicorn() {
    this.unicornsCollected++;
    this.updateUI();
  }

  public missUnicorn() {
    this.unicornsMissed++;
    this.updateUI();
  }

  public isLevelComplete() {
    return this.starsCollected >= this.totalStars;
  }

  public resetAll() {
    this.starsCollected = 0;
    this.level = 1;
    this.seed = Math.random();
    this.globalStars = 0;
    this.planetsVisited = 1;
    this.unicornsCollected = 0;
    this.unicornsMissed = 0;
    this.updateUI();
  }

  private updateUI() {
    const levelIndicator = document.getElementById('level-indicator');
    if (levelIndicator) levelIndicator.innerText = `Level ${this.level}`;

    const statStars = document.getElementById('stat-stars');
    if (statStars) statStars.innerText = this.globalStars.toString();

    const statPlanets = document.getElementById('stat-planets');
    if (statPlanets) statPlanets.innerText = this.planetsVisited.toString();

    const statUnicornsF = document.getElementById('stat-unicorns-found');
    if (statUnicornsF) statUnicornsF.innerText = this.unicornsCollected.toString();

    const statUnicornsM = document.getElementById('stat-unicorns-missed');
    if (statUnicornsM) statUnicornsM.innerText = this.unicornsMissed.toString();

    const starsContainer = document.getElementById('stars-container');
    if (starsContainer) {
      const icons = Array.from(starsContainer.querySelectorAll('.star-icon'));
      icons.forEach((icon, index) => {
        if (index < this.starsCollected) {
          icon.classList.add('collected');
        } else {
          icon.classList.remove('collected');
        }
      });
    }
  }
}

export const state = new GameState();
