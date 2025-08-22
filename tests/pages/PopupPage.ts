
import { Page, expect } from '@playwright/test';

export class PopupPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('http://localhost:5050/popup-sim.html');
  }

  startReplayBtn = () => this.page.getByText('Start Replay');
  saveReplayBtn = () => this.page.getByText('Save Replay');
  startRecBtn = () => this.page.getByText('Start Recording');
  stopBtn = () => this.page.getByText('Stop');
  endpointInput = () => this.page.locator('#endpoint');
  saveSettingsBtn = () => this.page.getByText('Save Settings').or(this.page.getByText('Save'));

  async startReplay() {
    await this.startReplayBtn().click();
  }

  async saveReplay() {
    await this.saveReplayBtn().click();
  }

  async startRecording() {
    await this.startRecBtn().click();
  }

  async stopRecording() {
    await this.stopBtn().click();
  }

  async setEndpoint(url: string) {
    await this.endpointInput().fill(url);
    await this.saveSettingsBtn().click();
  }
}
