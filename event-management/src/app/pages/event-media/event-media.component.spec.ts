import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventMediaComponent } from './event-media.component';

describe('EventMediaComponent', () => {
  let component: EventMediaComponent;
  let fixture: ComponentFixture<EventMediaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventMediaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventMediaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
